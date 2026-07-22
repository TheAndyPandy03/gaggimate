#include "GaggiMateClient.h"

GaggiMateClient::GaggiMateClient() {
    // Forward the mock's telemetry to whatever the firmware registered.
    // The simulator does not currently model a physical grinder potentiometer,
    // so provide a stable midpoint position and corresponding raw ADC value.
    _mock.onSensor =
        [this](float temperature,
               float pressure,
               float puckFlow,
               float pumpFlow,
               float puckResistance,
               float pumpPower,
               float heaterPower) {
            if (_sensorCb) {
                constexpr float SIM_GRIND_POSITION = 50.0f;
                constexpr int32_t SIM_GRINDER_RAW = 16384;

                _sensorCb(
                    temperature,
                    pressure,
                    puckFlow,
                    pumpFlow,
                    puckResistance,
                    pumpPower,
                    heaterPower,
                    SIM_GRIND_POSITION,
                    SIM_GRINDER_RAW);
            }
        };

    _mock.onVolumetric = [this](float volume) {
        if (_volumetricCb) {
            _volumetricCb(volume);
        }
    };

    _mock.onTof = [this](uint32_t distance) {
        if (_tofCb) {
            _tofCb(distance);
        }
    };
}

void GaggiMateClient::init(const String &) {
    _initialized = true;
}

bool GaggiMateClient::connectToServer() {
    if (_connected) {
        return true;
    }

    _connected = true;
    _pendingConnect = true; // Emit connection + system info from loop().
    return true;
}

void GaggiMateClient::loop() {
    if (_pendingConnect) {
        _pendingConnect = false;

        if (_connCb) {
            _connCb(true);
        }

        if (_systemInfoCb) {
            _systemInfoCb(
                "GaggiMate Sim",
                "sim-3.0",
                gm_proto::PROTOCOL_VERSION,
                true,
                true,
                true,
                true,
                {});
        }

        _mock.begin();
    }

    if (_autotunePending &&
        static_cast<int32_t>(millis() - _autotuneDueMs) >= 0) {
        _autotunePending = false;

        if (_autotuneResultCb) {
            // Plausible Gaggia PID values.
            _autotuneResultCb(
                58.397f,
                1.027f,
                249.055f,
                0.0f);
        }
    }

    if (_connected) {
        _mock.update();
    }
}

gm::Payload GaggiMateClient::buildPing() {
    return {gm::Payload::Ping};
}

gm::Payload GaggiMateClient::buildBoilerControl(
    uint8_t index,
    BoilerControlMode mode,
    float setpoint) {

    gm::Payload payload{gm::Payload::Boiler};
    payload.boiler = {index, mode, setpoint};
    return payload;
}

gm::Payload GaggiMateClient::buildPumpControl(
    uint8_t index,
    PumpControlMode mode,
    float power,
    float pressure,
    float flow) {

    gm::Payload payload{gm::Payload::Pump};
    payload.pump = {index, mode, power, pressure, flow};
    return payload;
}

gm::Payload GaggiMateClient::buildRelayControl(
    uint8_t index,
    bool open) {

    gm::Payload payload{gm::Payload::Relay};
    payload.relay = {index, open};
    return payload;
}

gm::Payload GaggiMateClient::buildPidSettings(
    float,
    float,
    float,
    float) {

    return {gm::Payload::Pid};
}

gm::Payload GaggiMateClient::buildPumpSettings(
    float,
    float,
    float,
    float,
    float,
    float,
    float,
    float) {

    return {gm::Payload::PumpSettings};
}

gm::Payload GaggiMateClient::buildAutotune(
    uint32_t,
    uint32_t,
    uint32_t) {

    return {gm::Payload::Autotune};
}

gm::Payload GaggiMateClient::buildPressureScale(float) {
    return {gm::Payload::PressureScale};
}

gm::Payload GaggiMateClient::buildTare() {
    return {gm::Payload::Tare};
}

gm::Payload GaggiMateClient::buildLedControl(
    const LedChannelCommand *,
    size_t) {

    return {gm::Payload::Led};
}

gm::Payload GaggiMateClient::buildGrinderCalibration(
    int32_t rawFine,
    int32_t rawCoarse,
    uint32_t steps,
    bool reverseDirection) {

    gm::Payload payload{gm::Payload::GrinderCalibration};
    payload.grinderCalibration.rawFine = rawFine;
    payload.grinderCalibration.rawCoarse = rawCoarse;
    payload.grinderCalibration.steps = steps;
    payload.grinderCalibration.reverseDirection = reverseDirection;
    return payload;
}

void GaggiMateClient::send(const gm::Payload &payload) {
    switch (payload.type) {
    case gm::Payload::Boiler:
        _mock.setBoiler(payload.boiler);
        break;

    case gm::Payload::Pump:
        _mock.setPump(payload.pump);
        break;

    case gm::Payload::Relay:
        _mock.setRelay(payload.relay);
        break;

    case gm::Payload::Tare:
        _mock.tareScale();
        break;

    case gm::Payload::GrinderCalibration:
        // The simulator currently emits a fixed grinder ADC position. Accepting
        // this command as a no-op keeps its communications surface identical to
        // firmware while allowing the calibration UI and settings flow to build.
        break;

    default:
        // Ping, PID, pump settings, autotune, pressure scale, and LED commands
        // do not directly affect the current simulator model.
        break;
    }
}

void GaggiMateClient::sendBatch(
    const gm::Payload *payloads,
    size_t count) {

    for (size_t index = 0; index < count; ++index) {
        send(payloads[index]);
    }
}

void GaggiMateClient::sendPing() {}

void GaggiMateClient::sendBoilerControl(
    uint8_t index,
    BoilerControlMode mode,
    float setpoint) {

    send(buildBoilerControl(index, mode, setpoint));
}

void GaggiMateClient::sendPumpControl(
    uint8_t index,
    PumpControlMode mode,
    float power,
    float pressure,
    float flow) {

    send(buildPumpControl(
        index,
        mode,
        power,
        pressure,
        flow));
}

void GaggiMateClient::sendRelayControl(
    uint8_t index,
    bool open) {

    send(buildRelayControl(index, open));
}

void GaggiMateClient::sendPidSettings(
    float,
    float,
    float,
    float) {}

void GaggiMateClient::sendPumpSettings(
    float,
    float,
    float,
    float,
    float,
    float,
    float,
    float,
    float,
    float,
    float,
    float) {}

void GaggiMateClient::sendAutotune(
    uint32_t,
    uint32_t,
    uint32_t) {

    _autotunePending = true;
    _autotuneDueMs = millis() + 1500;
}

void GaggiMateClient::sendPressureScale(float) {}

void GaggiMateClient::tare() {
    _mock.tareScale();
}

void GaggiMateClient::sendLedControl(
    const LedChannelCommand *,
    size_t) {}

void GaggiMateClient::sendGrinderCalibration(
    int32_t rawFine,
    int32_t rawCoarse,
    uint32_t steps,
    bool reverseDirection) {

    send(buildGrinderCalibration(
        rawFine,
        rawCoarse,
        steps,
        reverseDirection));
}