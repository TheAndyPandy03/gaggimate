#ifndef GRIND_POSITION_SENSOR_H
#define GRIND_POSITION_SENSOR_H

#include "ADSAdc.h"
#include <Arduino.h>

constexpr float GRIND_POSITION_FILTER_ALPHA = 0.15f;

class GrindPositionSensor {
  public:
    GrindPositionSensor(ADSAdc *adc, int raw_min = 0, int raw_max = 32767, uint8_t channel = 3);
    ~GrindPositionSensor() = default;

    void setup();
    void onReading(int reading);

    float getPosition() const { return _position; };
    int getRawValue() const { return _raw_value; };

  private:
    float _position = 0.0f;
    int _raw_value = 0;
    int _raw_min;
    int _raw_max;
    ADSAdc *_adc = nullptr;
    uint8_t _channel;
    bool _initialized = false;

    const char *LOG_TAG = "GrindPositionSensor";
};

#endif // GRIND_POSITION_SENSOR_H
