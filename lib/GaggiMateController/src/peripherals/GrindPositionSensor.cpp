#include "GrindPositionSensor.h"

#include <algorithm>

GrindPositionSensor::GrindPositionSensor(ADSAdc *adc, int raw_min, int raw_max, uint8_t channel)
    : _raw_min(raw_min), _raw_max(raw_max), _adc(adc), _channel(channel) {}

void GrindPositionSensor::setup() {
    _adc->registerCallback([this](uint8_t channel, int reading) {
        if (channel == _channel) {
            onReading(reading);
        }
    });
}

void GrindPositionSensor::onReading(int reading) {
    _raw_value = reading;

    if (_raw_max == _raw_min) {
        ESP_LOGE(LOG_TAG, "Invalid calibration range: raw minimum and maximum are equal");
        return;
    }

    float position =
        static_cast<float>(reading - _raw_min) /
        static_cast<float>(_raw_max - _raw_min);

    position = std::clamp(position, 0.0f, 1.0f) * 100.0f;

    if (!_initialized) {
        _position = position;
        _initialized = true;
    } else {
        _position += GRIND_POSITION_FILTER_ALPHA * (position - _position);
    }

    ESP_LOGV(LOG_TAG, "Channel %d, ADC Reading: %d, Grind Position: %f", _channel, reading, _position);
}
