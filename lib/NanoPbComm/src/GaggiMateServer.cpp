#include "GaggiMateServer.h"

#include <cstdio>
#include <cstring>
#include <esp_log.h>

GaggiMateServer::GaggiMateServer() : _endpoint(_transport) {}

void GaggiMateServer::init(const String &deviceName,
                           const String &hardware,
                           const String &version,
                           const gm::DeviceCapabilities &capabilities) {
    setSystemInfo(hardware, version, capabilities);
    registerHandlers();

    _endpoint.onConnection([this](bool connected) {
        if (connected) {
            pushSystemInfo();
        }
    });

    _endpoint.begin();
    _transport.init(deviceName);

    if (xTaskCreatePinnedToCore(
            pumpTask,
            "GaggiMateServer",
            4096,
            this,
            1,
            &_taskHandle,
            0) != pdPASS) {
        _taskHandle = nullptr;
        ESP_LOGE(
            "GaggiMateServer",
            "Failed to create pump task; ACK/retransmit will not run");
    }
}

void GaggiMateServer::pumpTask(void *arg) {
    auto *self = static_cast<GaggiMateServer *>(arg);
    TickType_t lastWake = xTaskGetTickCount();

    for (;;) {
        self->_endpoint.loop();
        xTaskDelayUntil(&lastWake, pdMS_TO_TICKS(15));
    }
}

void GaggiMateServer::setSystemInfo(
    const String &hardware,
    const String &version,
    const gm::DeviceCapabilities &capabilities) {

    memset(&_systemInfo, 0, sizeof(_systemInfo));

    strlcpy(
        _systemInfo.hardware,
        hardware.c_str(),
        sizeof(_systemInfo.hardware));

    strlcpy(
        _systemInfo.version,
        version.c_str(),
        sizeof(_systemInfo.version));

    _systemInfo.protocol_version = gm_proto::PROTOCOL_VERSION;
    _systemInfo.has_capabilities = true;
    _systemInfo.capabilities = capabilities;

    char json[224];

    snprintf(
        json,
        sizeof(json),
        "{\"hw\":\"%s\",\"v\":\"%s\",\"pv\":%u,"
        "\"cp\":{\"ps\":%s,\"dm\":%s,\"led\":%s,\"tof\":%s}}",
        hardware.c_str(),
        version.c_str(),
        static_cast<unsigned>(gm_proto::PROTOCOL_VERSION),
        capabilities.pressure ? "true" : "false",
        capabilities.dimming ? "true" : "false",
        capabilities.led_control ? "true" : "false",
        capabilities.tof ? "true" : "false");

    _transport.setInfo(json);
}

void GaggiMateServer::pushSystemInfo() {
    gm::Payload payload = gaggimate_Payload_init_zero;

    payload.which_content = gaggimate_Payload_system_info_tag;
    payload.content.system_info = _systemInfo;

    _endpoint.send(payload);
}

gm::Payload GaggiMateServer::buildSensorData(
    float temperature,
    float pressure,
    float puckFlow,
    float pumpFlow,
    float puckResistance,
    float pumpPower,
    float heaterPower,
    float grindPosition,
    int32_t grinderPositionRaw) {

    gm::Payload payload = gaggimate_Payload_init_zero;

    payload.which_content = gaggimate_Payload_sensor_tag;

    payload.content.sensor.boilers_count = 1;
    payload.content.sensor.boilers[0].index = 0;
    payload.content.sensor.boilers[0].temperature = temperature;
    payload.content.sensor.boilers[0].pressure = pressure;

    payload.content.sensor.puck_flow = puckFlow;
    payload.content.sensor.pump_flow = pumpFlow;
    payload.content.sensor.puck_resistance = puckResistance;
    payload.content.sensor.pump_power = pumpPower;
    payload.content.sensor.heater_power = heaterPower;
    payload.content.sensor.grind_position = grindPosition;
    payload.content.sensor.grind_position_raw = grinderPositionRaw;

    return payload;
}

gm::Payload GaggiMateServer::buildButtonState(
    uint8_t index,
    bool pressed) {

    gm::Payload payload = gaggimate_Payload_init_zero;

    payload.which_content = gaggimate_Payload_button_tag;
    payload.content.button.index = index;
    payload.content.button.pressed = pressed;

    return payload;
}

gm::Payload GaggiMateServer::buildAutotuneResult(
    float kp,
    float ki,
    float kd,
    float kf) {

    gm::Payload payload = gaggimate_Payload_init_zero;

    payload.which_content = gaggimate_Payload_autotune_result_tag;
    payload.content.autotune_result.kp = kp;
    payload.content.autotune_result.ki = ki;
    payload.content.autotune_result.kd = kd;
    payload.content.autotune_result.kf = kf;

    return payload;
}

gm::Payload GaggiMateServer::buildVolumetricMeasurement(float volume) {
    gm::Payload payload = gaggimate_Payload_init_zero;

    payload.which_content = gaggimate_Payload_volumetric_tag;
    payload.content.volumetric.volume = volume;

    return payload;
}

gm::Payload GaggiMateServer::buildTofMeasurement(uint32_t distance) {
    gm::Payload payload = gaggimate_Payload_init_zero;

    payload.which_content = gaggimate_Payload_tof_tag;
    payload.content.tof.distance = distance;

    return payload;
}

gm::Payload GaggiMateServer::buildError(int code) {
    gm::Payload payload = gaggimate_Payload_init_zero;

    payload.which_content = gaggimate_Payload_error_tag;
    payload.content.error.code = static_cast<gm::ErrorCode>(code);

    return payload;
}

void GaggiMateServer::sendSensorData(
    float temperature,
    float pressure,
    float puckFlow,
    float pumpFlow,
    float puckResistance,
    float pumpPower,
    float heaterPower,
    float grindPosition,
    int32_t grinderPositionRaw) {

    _endpoint.sendUnreliable(
        buildSensorData(
            temperature,
            pressure,
            puckFlow,
            pumpFlow,
            puckResistance,
            pumpPower,
            heaterPower,
            grindPosition,
            grinderPositionRaw));
}

void GaggiMateServer::sendButtonState(
    uint8_t index,
    bool pressed) {

    _endpoint.send(buildButtonState(index, pressed));
}

void GaggiMateServer::sendAutotuneResult(
    float kp,
    float ki,
    float kd,
    float kf) {

    _endpoint.send(buildAutotuneResult(kp, ki, kd, kf));
}

void GaggiMateServer::sendVolumetricMeasurement(float volume) {
    _endpoint.sendUnreliable(buildVolumetricMeasurement(volume));
}

void GaggiMateServer::sendTofMeasurement(uint32_t distance) {
    _endpoint.sendUnreliable(buildTofMeasurement(distance));
}

void GaggiMateServer::sendError(int code) {
    _endpoint.send(buildError(code));
}

void GaggiMateServer::registerHandlers() {
    _endpoint.on(
        gaggimate_Payload_ping_tag,
        [this](const gm::Payload &) {
            if (_pingCb) {
                _pingCb();
            }
        });

    _endpoint.on(
        gaggimate_Payload_boiler_tag,
        [this](const gm::Payload &payload) {
            if (_boilerCb) {
                _boilerCb(
                    static_cast<uint8_t>(
                        payload.content.boiler.index),
                    static_cast<BoilerControlMode>(
                        payload.content.boiler.mode),
                    payload.content.boiler.setpoint);
            }
        });

    _endpoint.on(
        gaggimate_Payload_pump_tag,
        [this](const gm::Payload &payload) {
            if (_pumpCb) {
                _pumpCb(
                    static_cast<uint8_t>(
                        payload.content.pump.index),
                    static_cast<PumpControlMode>(
                        payload.content.pump.mode),
                    payload.content.pump.power,
                    payload.content.pump.pressure,
                    payload.content.pump.flow);
            }
        });

    _endpoint.on(
        gaggimate_Payload_relay_tag,
        [this](const gm::Payload &payload) {
            if (_relayCb) {
                _relayCb(
                    static_cast<uint8_t>(
                        payload.content.relay.index),
                    payload.content.relay.open);
            }
        });

    _endpoint.on(
        gaggimate_Payload_pid_tag,
        [this](const gm::Payload &payload) {
            if (_pidCb) {
                _pidCb(
                    payload.content.pid.kp,
                    payload.content.pid.ki,
                    payload.content.pid.kd,
                    payload.content.pid.kf);
            }
        });

    _endpoint.on(
        gaggimate_Payload_pump_model_tag,
        [this](const gm::Payload &payload) {
            if (_pumpSettingsCb) {
                _pumpSettingsCb(payload.content.pump_model);
            }
        });

    _endpoint.on(
        gaggimate_Payload_autotune_tag,
        [this](const gm::Payload &payload) {
            if (_autotuneCb) {
                _autotuneCb(
                    payload.content.autotune.test_time,
                    payload.content.autotune.samples,
                    payload.content.autotune.heater_wattage);
            }
        });

    _endpoint.on(
        gaggimate_Payload_pressure_scale_tag,
        [this](const gm::Payload &payload) {
            if (_pressureScaleCb) {
                _pressureScaleCb(
                    payload.content.pressure_scale.scale);
            }
        });

    _endpoint.on(
        gaggimate_Payload_tare_tag,
        [this](const gm::Payload &) {
            if (_tareCb) {
                _tareCb();
            }
        });

    _endpoint.on(
        gaggimate_Payload_led_tag,
        [this](const gm::Payload &payload) {
            if (!_ledCb) {
                return;
            }

            for (pb_size_t index = 0;
                 index < payload.content.led.channels_count;
                 ++index) {

                _ledCb(
                    static_cast<uint8_t>(
                        payload.content.led.channels[index].channel),
                    static_cast<uint8_t>(
                        payload.content.led.channels[index].brightness));
            }
        });

    _endpoint.on(
        gaggimate_Payload_grinder_calibration_tag,
        [this](const gm::Payload &payload) {
            if (_grinderCalibrationCb) {
                _grinderCalibrationCb(
                    payload.content.grinder_calibration.raw_fine,
                    payload.content.grinder_calibration.raw_coarse,
                    payload.content.grinder_calibration.steps,
                    payload.content.grinder_calibration.reverse_direction);
            }
        });
}