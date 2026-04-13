import { PERMISSION_REGISTRY } from "../common/constants/permissions.const";
import { renderPermissionsFile } from "./generate-permissions";

describe("renderPermissionsFile", () => {
  it("renders permission keys, definitions, and default keys from the registry", () => {
    const rendered = renderPermissionsFile(
      Object.entries(PERMISSION_REGISTRY),
      [...new Set(Object.values(PERMISSION_REGISTRY).map((item) => item.group))],
    );

    expect(rendered).toContain('adminAccess: "admin:access"');
    expect(rendered).toContain("export const PERMISSION_DEFINITIONS = [");
    expect(rendered).toContain("export const DEFAULT_PERMISSION_KEYS = [");
    expect(rendered).toContain('"customer:self:view"');
    expect(rendered).not.toContain("examples:read");
  });
});
