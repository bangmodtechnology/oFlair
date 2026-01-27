import { parseControlMXml } from "./xml-parser";
import { parseControlMJson } from "./json-parser";
import type { ControlMDefinition } from "@/types/controlm";

export async function parseControlM(
  content: string,
  type: "xml" | "json"
): Promise<ControlMDefinition> {
  if (type === "xml") {
    return parseControlMXml(content);
  } else {
    return parseControlMJson(content);
  }
}

export { parseControlMXml } from "./xml-parser";
export { parseControlMJson } from "./json-parser";
