import { Bool, Num, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { type AppContext } from "../types";

export class SheetRowCount extends OpenAPIRoute {
        schema = {
                tags: ["Sheets"],
                summary: "Check if a Google Sheet exceeds a row threshold",
                responses: {
                        "200": {
                                description: "Returns the row count and threshold comparison",
                                content: {
                                        "application/json": {
                                                schema: z.object({
                                                        success: Bool(),
                                                        rowCount: Num({
                                                                description: "Number of rows returned for the configured range",
                                                        }),
                                                        exceedsThreshold: Bool({
                                                                description: "True when row count is greater than 20",
                                                        }),
                                                }),
                                        },
                                },
                        },
                        "500": {
                                description: "Configuration missing or Google Sheets error",
                                content: {
                                        "application/json": {
                                                schema: z.object({
                                                        success: Bool(),
                                                        error: Str(),
                                                }),
                                        },
                                },
                        },
                },
        };

        async handle(c: AppContext) {
                const { SHEETS_API_KEY, SHEET_ID, SHEET_RANGE } = c.env;

                if (!SHEETS_API_KEY || !SHEET_ID) {
                        return Response.json(
                                {
                                        success: false,
                                        error: "Missing required configuration: SHEETS_API_KEY and SHEET_ID must be set",
                                },
                                {
                                        status: 500,
                                },
                        );
                }

                const range = SHEET_RANGE ?? "Sheet1";
                const url = new URL(
                        `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
                                SHEET_ID,
                        )}/values/${encodeURIComponent(range)}`,
                );
                url.searchParams.set("key", SHEETS_API_KEY);

                let response: Response;
                try {
                        response = await fetch(url);
                } catch (error) {
                        return Response.json(
                                {
                                        success: false,
                                        error: "Failed to reach Google Sheets API",
                                },
                                {
                                        status: 502,
                                },
                        );
                }

                if (!response.ok) {
                        return Response.json(
                                {
                                        success: false,
                                        error: `Google Sheets API responded with status ${response.status}`,
                                },
                                {
                                        status: 502,
                                },
                        );
                }

                const payload = await response.json<{
                        values?: unknown;
                }>();

                const values = Array.isArray(payload.values) ? payload.values : [];
                const rowCount = values.length;
                const exceedsThreshold = rowCount > 20;

                return {
                        success: true,
                        rowCount,
                        exceedsThreshold,
                };
        }
}
