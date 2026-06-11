// Fix Event read-only constants for RN 0.81
if (typeof global.Event !== 'undefined') {
    const eventConstants = {
        NONE: 0,
        CAPTURING_PHASE: 1,
        AT_TARGET: 2,
        BUBBLING_PHASE: 3,
    };

    Object.keys(eventConstants).forEach((key) => {
        const descriptor = Object.getOwnPropertyDescriptor(global.Event, key);
        if (descriptor && descriptor.writable === false) {
            try {
                Object.defineProperty(global.Event, key, {
                    value: eventConstants[key],
                    writable: true,
                    configurable: true,
                });
            } catch (e) {
                // ignore if still fails
            }
        }
    });
}