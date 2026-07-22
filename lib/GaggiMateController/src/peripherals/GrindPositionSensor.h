#ifndef GRIND_POSITION_SENSOR_H
#define GRIND_POSITION_SENSOR_H

#include "ADSAdc.h"
#include <Arduino.h>

constexpr float GRIND_POSITION_FILTER_ALPHA = 0.15f;
constexpr int DEFAULT_GRINDER_STEPS = 30;
constexpr int MIN_GRINDER_STEPS = 2;
constexpr int MAX_GRINDER_STEPS = 200;

class GrindPositionSensor {
  public:
    GrindPositionSensor(
        ADSAdc *adc,
        int rawFine = 0,
        int rawCoarse = 32767,
        uint8_t channel = 3);

    ~GrindPositionSensor() = default;

    void setup();
    void onReading(int reading);

    void setCalibration(
        int rawFine,
        int rawCoarse,
        int steps,
        bool reverseDirection);

    float getPosition() const {
        return _position;
    }

    int getStep() const {
        return _step;
    }

    int getRawValue() const {
        return _rawValue;
    }

    int getRawFine() const {
        return _rawFine;
    }

    int getRawCoarse() const {
        return _rawCoarse;
    }

    int getSteps() const {
        return _steps;
    }

    bool isReverseDirection() const {
        return _reverseDirection;
    }

  private:
    void updatePosition(int reading);

    float _position = 0.0f;
    int _step = 1;
    int _rawValue = 0;

    int _rawFine;
    int _rawCoarse;
    int _steps = DEFAULT_GRINDER_STEPS;
    bool _reverseDirection = false;

    ADSAdc *_adc = nullptr;
    uint8_t _channel;
    bool _initialized = false;

    const char *LOG_TAG = "GrindPositionSensor";
};

#endif // GRIND_POSITION_SENSOR_H