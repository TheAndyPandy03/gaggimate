#include "GrindPositionSensor.h"

#include <algorithm>
#include <cmath>

GrindPositionSensor::GrindPositionSensor(
    ADSAdc *adc,
    int rawFine,
    int rawCoarse,
    uint8_t channel)
    : _rawFine(rawFine),
      _rawCoarse(rawCoarse),
      _adc(adc),
      _channel(channel) {}

void GrindPositionSensor::setup() {
    _adc->registerCallback([this](uint8_t channel, int reading) {
        if (channel == _channel) {
            onReading(reading);
        }
    });
}

void GrindPositionSensor::setCalibration(
    int rawFine,
    int rawCoarse,
    int steps,
    bool reverseDirection) {

    _rawFine = rawFine;
    _rawCoarse = rawCoarse;
    _steps = std::clamp(
        steps,
        MIN_GRINDER_STEPS,
        MAX_GRINDER_STEPS);
    _reverseDirection = reverseDirection;

    _initialized = false;
}

void GrindPositionSensor::onReading(int reading) {
    _rawValue = reading;
    updatePosition(reading);
}

void GrindPositionSensor::updatePosition(int reading) {
    if (_rawFine == _rawCoarse) {
        ESP_LOGE(LOG_TAG,
                 "Invalid calibration range");
        return;
    }

    float position =
        static_cast<float>(reading - _rawFine) /
        static_cast<float>(_rawCoarse - _rawFine);

    position = std::clamp(position, 0.0f, 1.0f);

    if (_reverseDirection) {
        position = 1.0f - position;
    }

    float percent = position * 100.0f;

    if (!_initialized) {
        _position = percent;
        _initialized = true;
    } else {
        _position +=
            GRIND_POSITION_FILTER_ALPHA *
            (percent - _position);
    }

    _step = std::clamp(
        static_cast<int>(
            std::lround(position * (_steps - 1))) + 1,
        1,
        _steps);

    ESP_LOGV(
        LOG_TAG,
        "ADC=%d Position=%.2f%% Step=%d",
        reading,
        _position,
        _step);
}