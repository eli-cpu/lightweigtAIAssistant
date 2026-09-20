import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schemas = {
  getLocationData: {
    description: "Get location data for an IP address.",
    properties: { ipAddress: { type: "string" } },
    required: ["ipAddress"],
  },

  downloadMusic: {
    description: "Download music from a YouTube URL.",
    properties: {
      url: { type: "string" },
      outputDir: { type: "string" },
    },
    required: ["url"],
  },

  get_current_time: {
    description: "Get the current time.",
    properties: {},
    required: [],
  },

  get_time_in_timezone: {
    description: "Get the current time in a timezone.",
    properties: { timezone: { type: "string" } },
    required: ["timezone"],
  },

  get_date_in_timezone: {
    description: "Get the current date in a timezone.",
    properties: { timezone: { type: "string" } },
    required: ["timezone"],
  },

  getWeatherData: {
    description: "Get weather data for coordinates.",
    properties: {
      longitude: { type: "number" },
      latitude: { type: "number" },
    },
    required: ["longitude", "latitude"],
  },

  getEventDetails: {
    description: "Get calendar event details.",
    properties: { eventId: { type: "string" } },
    required: ["eventId"],
  },

  getEventsByDate: {
    description: "Get calendar events for a date.",
    properties: { date: { type: "string" } },
    required: ["date"],
  },

  createEvent: {
    description: "Create a calendar event.",
    properties: { eventData: { type: "object" } },
    required: ["eventData"],
  },

  updateEvent: {
    description: "Update a calendar event.",
    properties: {
      eventId: { type: "string" },
      updatedData: { type: "object" },
    },
    required: ["eventId", "updatedData"],
  },

  deleteEvent: {
    description: "Delete a calendar event.",
    properties: { eventId: { type: "string" } },
    required: ["eventId"],
  },
};

export default async function getFunctions() {
  const actionsPath = path.join(__dirname, "actions");

  const files = fs
    .readdirSync(actionsPath)
    .filter((file) => file.endsWith(".js"));

  const modules = await Promise.all(
    files.map(
      async (file) => import(pathToFileURL(path.join(actionsPath, file)).href),
    ),
  );

  return modules.flatMap((module) =>
    Object.entries(module)
      .filter(([, fn]) => typeof fn === "function")
      .map(([name, fn]) => {
        const schema = schemas[name] ?? {
          description: `Run the ${name} action.`,
          properties: {},
          required: [],
        };

        return {
          name,
          fn,
          tool: {
            type: "function",
            function: {
              name,
              description: schema.description,
              parameters: {
                type: "object",
                properties: schema.properties,
                required: schema.required,
              },
            },
          },
        };
      }),
  );
}
