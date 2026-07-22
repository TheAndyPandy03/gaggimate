#include "GaggiMateClient.h"

GaggiMateClient::GaggiMateClient() : _endpoint(_transport) {}

void GaggiMateClient::init(const String &deviceName) {
    registerHandlers();

    _endpoint.onConnection([this](bool connected) {
        if (_connCb) {
            _connCb(connected);
        }
    });

    _transport.onIncompatible([this](const String &info) {
        if (_incompatibleCb) {
            _incompatibleCb(info);
        }
    });

    _endpoint.begin();
    _transport.init(deviceName);
}

void GaggiMateClient::loop() {
    _transport.maintain();
    _endpoint.loop();
}

gm::Payload GaggiMateClient::buildPing() {
    gm::Payload payload = gaggimate_Payload_init_zero;
    payload.which_content = gaggimate_Payload_ping_tag;
    return payload;
}

gm::Payload GaggiMateClient::buildBoilerControl(
    uint8_t index,
    BoilerControlMode mode,
    float setpoint) {

    gm::Payload payload = gaggimate_Payload_init_zero;
    payload.which_content = gaggimate_Payload_boiler_tag;
    payload.content.boiler.index = index;
    payload.content.boiler.mode = static_cast<gm::BoilerMode>(mode);
    payload.content.boiler.setpoint = setpoint;
    return payload;
}

gm::Payload GaggiMateClient::buildPumpControl(
    uint8_t index,
    PumpControlMode mode,
    float power,
    float pressure,
    float flow) {

    gm::Payload payload = gaggimate_Payload_init_zero;
    payload.which_content = gaggimate_Payload_pump_tag;
    payload.content.pump.index = index;
    payload.content.pump.mode = static_cast<gm::PumpMode>(mode);
    payload.content.pump.power = power;
    payload.content.pump.pressure = pressure;
    payload.content.pump.flow = flow;
    return payload;
}

gm::Payload GaggiMateClient::buildRelayControl(uint8_t index, bool open) {
    gm::Payload payload = gaggimate_Payload_init_zero;
    payload.which_content = gaggimate_Payload_relay_tag;
    payload.content.relay.index = index;
    payload.content.relay.open = open;
    return payload;
}

gm::Payload GaggiMateClient::buildPidSettings(float kp, float ki, float kd, float kf) {
    gm::Payload payload = gaggimate_Payload_init_zero;
    payload.which_content = gaggimate_Payload_pid_tag;
    payload.content.pid.kp = kp;
    payload.content.pid.ki = ki;
    payload.content.pid.kd = kd;
    payload.content.pid.kf = kf;
    return payload;
}

gm::Payload GaggiMateClient::buildPumpSettings(
    float a,
    float b,
    float c,
    float d,
    float commutationGain,
    float convergenceGain,
    float integralGain,
    float maxPower,
    float slipA,
    float slipB,
    float slipC,
    float slipD) {

    gm::Payload payload = gaggimate_Payload_init_zero;
    payload.which_content = gaggimate_Payload_pump_model_tag;
    payload.content.pump_model.a = a;
    payload.content.pump_model.b = b;
    payload.content.pump_model.c = c;
    payload.content.pump_model.d = d;
    payload.content.pump_model.commutationGain = commutationGain;
    payload.content.pump_model.convergenceGain = convergenceGain;
    payload.content.pump_model.integralGain = integralGain;
    payload.content.pump_model.maxBLDCPower = maxPower;
    payload.content.pump_model.slipA = slipA;
    payload.content.pump_model.slipB = slipB;
    payload.content.pump_model.slipC = slipC;
    payload.content.pump_model.slipD = slipD;
    return payload;
}

gm::Payload GaggiMateClient::buildAutotune(
    uint32_t testTime,
    uint32_t samples,
    uint32_t heaterWattage) {

    gm::Payload payload = gaggimate_Payload_init_zero;
    payload.which_content = gaggimate_Payload_autotune_tag;
    payload.content.autotune.test_time = testTime;
    payload.content.autotune.samples = samples;
    payload.content.autotune.heater_wattage = heaterWattage;
    return payload;
}

gm::Payload GaggiMateClient::buildPressureScale(float scale) {
    gm::Payload payload = gaggimate_Payload_init_zero;
    payload.which_content = gaggimate_Payload_pressure_scale_tag;
    payload.content.pressure_scale.scale = scale;
    return payload;
}

gm::Payload GaggiMateClient::buildTare() {
    gm::Payload payload = gaggimate_Payload_init_zero;
    payload.which_content = gaggimate_Payload_tare_tag;
    return payload;
}

gm::Payload GaggiMateClient::buildLedControl(
    const LedChannelCommand *channels,
    size_t count) {

    gm::Payload payload = gaggimate_Payload_init_zero;
    payload.which_content = gaggimate_Payload_led_tag;

    const size_t maxCount =
        sizeof(payload.content.led.channels) /
        sizeof(payload.content.led.channels[0]);

    if (channels == nullptr) {
        count = 0;
    }

    if (count > maxCount) {
        count = maxCount;
    }

    payload.content.led.channels_count = static_cast<pb_size_t>(count);

    for (size_t index = 0; index < count; ++index) {
        payload.content.led.channels[index].channel = channels[index].channel;
        payload.content.led.channels[index].brightness = channels[index].brightness;
    }

    return payload;
}

gm::Payload GaggiMateClient::buildGrinderCalibration(
    int32_t rawFine,
    int32_t rawCoarse,
    uint32_t steps,
    bool reverseDirection) {

    gm::Payload payload = gaggimate_Payload_init_zero;
    payload.which_content = gaggimate_Payload_grinder_calibration_tag;
    payload.content.grinder_calibration.raw_fine = rawFine;
    payload.content.grinder_calibration.raw_coarse = rawCoarse;
    payload.content.grinder_calibration.steps = steps;
    payload.content.grinder_calibration.reverse_direction = reverseDirection;
    return payload;
}

void GaggiMateClient::sendPing() {
    _endpoint.send(buildPing());
}

void GaggiMateClient::sendBoilerControl(
    uint8_t index,
    BoilerControlMode mode,
    float setpoint) {

    _endpoint.send(buildBoilerControl(index, mode, setpoint));
}

void GaggiMateClient::sendPumpControl(
    uint8_t index,
    PumpControlMode mode,
    float power,
    float pressure,
    float flow) {

    _endpoint.send(buildPumpControl(index, mode, power, pressure, flow));
}

void GaggiMateClient::sendRelayControl(uint8_t index, bool open) {
    _endpoint.send(buildRelayControl(index, open));
}

void GaggiMateClient::sendPidSettings(float kp, float ki, float kd, float kf) {
    _endpoint.send(buildPidSettings(kp, ki, kd, kf));
}

void GaggiMateClient::sendPumpSettings(
    float a,
    float b,
    float c,
    float d,
    float commutationGain,
    float convergenceGain,
    float integralGain,
    float maxPower,
    float slipA,
    float slipB,
    float slipC,
    float slipD) {

    _endpoint.send(
        buildPumpSettings(
            a,
            b,
            c,
            d,
            commutationGain,
            convergenceGain,
            integralGain,
            maxPower,
            slipA,
            slipB,
            slipC,
            slipD));
}

void GaggiMateClient::sendAutotune(
    uint32_t testTime,
    uint32_t samples,
    uint32_t heaterWattage) {

    _endpoint.send(buildAutotune(testTime, samples, heaterWattage));
}

void GaggiMateClient::sendPressureScale(float scale) {
    _endpoint.send(buildPressureScale(scale));
}

void GaggiMateClient::tare() {
    _endpoint.send(buildTare());
}

void GaggiMateClient::sendLedControl(
    const LedChannelCommand *channels,
    size_t count) {

    _endpoint.send(buildLedControl(channels, count));
}

void GaggiMateClient::sendGrinderCalibration(
    int32_t rawFine,
    int32_t rawCoarse,
    uint32_t steps,
    bool reverseDirection) {

    _endpoint.send(
        buildGrinderCalibration(
            rawFine,
            rawCoarse,
            steps,
            reverseDirection));
}

void GaggiMateClient::registerHandlers() {
    _endpoint.on(
        gaggimate_Payload_system_info_tag,
        [this](const gm::Payload &payload) {
            if (!_systemInfoCb) {
                return;
            }

            std::vector<uint32_t> addonList;

            for (pb_size_t index = 0;
                 index < payload.content.system_info.capabilities.addons_count;
                 ++index) {
                addonList.push_back(
                    payload.content.system_info.capabilities.addons[index].type);
            }

            _systemInfoCb(
                payload.content.system_info.hardware,
                payload.content.system_info.version,
                payload.content.system_info.protocol_version,
                payload.content.system_info.capabilities.dimming,
                payload.content.system_info.capabilities.pressure,
                payload.content.system_info.capabilities.led_control,
                payload.content.system_info.capabilities.tof,
                addonList);
        });

    _endpoint.on(
        gaggimate_Payload_sensor_tag,
        [this](const gm::Payload &payload) {
            if (!_sensorCb) {
                return;
            }

            float temperature = 0.0f;
            float pressure = 0.0f;

            if (payload.content.sensor.boilers_count > 0) {
                temperature =
                    payload.content.sensor.boilers[0].temperature;
                pressure =
                    payload.content.sensor.boilers[0].pressure;
            }

            _sensorCb(
                temperature,
                pressure,
                payload.content.sensor.puck_flow,
                payload.content.sensor.pump_flow,
                payload.content.sensor.puck_resistance,
                payload.content.sensor.pump_power,
                payload.content.sensor.heater_power,
                payload.content.sensor.grind_position,
                payload.content.sensor.grind_position_raw);
        });

    _endpoint.on(
        gaggimate_Payload_button_tag,
        [this](const gm::Payload &payload) {
            if (_buttonCb) {
                _buttonCb(
                    static_cast<uint8_t>(payload.content.button.index),
                    payload.content.button.pressed);
            }
        });

    _endpoint.on(
        gaggimate_Payload_autotune_result_tag,
        [this](const gm::Payload &payload) {
            if (_autotuneResultCb) {
                _autotuneResultCb(
                    payload.content.autotune_result.kp,
                    payload.content.autotune_result.ki,
                    payload.content.autotune_result.kd,
                    payload.content.autotune_result.kf);
            }
        });

    _endpoint.on(
        gaggimate_Payload_volumetric_tag,
        [this](const gm::Payload &payload) {
            if (_volumetricCb) {
                _volumetricCb(payload.content.volumetric.volume);
            }
        });

    _endpoint.on(
        gaggimate_Payload_tof_tag,
        [this](const gm::Payload &payload) {
            if (_tofCb) {
                _tofCb(payload.content.tof.distance);
            }
        });

    _endpoint.on(
        gaggimate_Payload_error_tag,
        [this](const gm::Payload &payload) {
            if (_errorCb) {
                _errorCb(static_cast<int>(payload.content.error.code));
            }
        });
}