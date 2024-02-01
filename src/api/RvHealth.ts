import z from "zod"

const HealthSystemAlertSchema = z.object({
    text: z.optional(z.string()),
    dismissable: z.optional(z.boolean()),
    actions: z.optional(
        z.array(
            z.object({
                text: z.string(),
                type: z.union([ z.literal("internal"), z.literal("external") ]),
                href: z.string()
            })
        )
    ),
    version: z.optional(z.string())
})

type HealthSystemAlert = z.infer<typeof HealthSystemAlertSchema>

class RvHealthAPI {
    private parseResponse(response: string): HealthSystemAlert {
        const json = JSON.parse(response)
        const parsed = HealthSystemAlertSchema.parse(json)
        
        return parsed 
    }

    private async getHealthInfoAsText(): Promise<string> {
        const response = await fetch("https://health.revolt.chat/api/health")
        return response.text()
    }

    async getServerHealth(): Promise<HealthSystemAlert> {
        const response = await this.getHealthInfoAsText()
        const information = this.parseResponse(response);

        return information
    }
}

export { RvHealthAPI }