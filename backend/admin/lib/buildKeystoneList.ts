import { list } from "@keystone-6/core";
import { allowAll } from "@keystone-6/core/access";
import { text, timestamp, float } from "@keystone-6/core/fields";

type FieldDef = {
  type: "string" | "timestamp" | "float";
  required?: boolean;
  unique?: boolean;
  maxLength?: number;
  defaultNow?: boolean;
  default?: number;
  label?: string;
};

export function buildKeystoneList(
  tableName: string,
  fields: Record<string, FieldDef>,
) {
  const keystoneFields: Record<string, any> = {};

  for (const [name, def] of Object.entries(fields)) {
    switch (def.type) {
      case "string":
        keystoneFields[name] = text({
          validation: {
            isRequired: def.required ?? false,
            ...(def.maxLength ? { length: { max: def.maxLength } } : {}),
          },
          ...(def.unique ? { isIndexed: "unique" as const } : {}),
          ...(def.label ? { ui: { description: def.label } } : {}),
        });
        break;
      case "timestamp":
        keystoneFields[name] = timestamp({
          ...(def.defaultNow ? { defaultValue: { kind: "now" as const } } : {}),
          db: { map: name },
          ...(def.label ? { ui: { description: def.label } } : {}),
        });
        break;
      case "float":
        keystoneFields[name] = float({
          defaultValue: def.default ?? 0,
          db: { map: name },
          ...(def.label ? { ui: { description: def.label } } : {}),
        });
        break;
    }
  }

  return list({
    access: allowAll,
    db: { map: tableName },
    fields: keystoneFields,
  });
}
