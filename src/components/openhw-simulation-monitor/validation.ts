export const validation = [
    {
        id: "sim_monitor_power",
        description: "Simulation Monitor must be connected to power and ground to operate.",
        check: (netlist: any, comp: any) => {
            const hasVcc = comp.pins?.VCC?.connected;
            const hasGnd = comp.pins?.GND?.connected;
            if (!hasVcc || !hasGnd) {
                return {
                    pass: false,
                    reasons: [`Simulation Monitor '${comp.id}' requires both VCC and GND connections.`]
                };
            }
            return { pass: true };
        }
    }
];
