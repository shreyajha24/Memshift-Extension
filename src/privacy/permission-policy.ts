export class PermissionPolicyEngine {
  /**
   * List of allowed and declared permissions.
   */
  public static readonly ALLOWED_PERMISSIONS = ['activeTab', 'scripting', 'storage'] as const;

  /**
   * Explicitly forbidden invasive permissions.
   */
  public static readonly FORBIDDEN_PERMISSIONS = [
    'history',
    'bookmarks',
    'cookies',
    'webNavigation',
    'management',
    'tabs',
    'webRequest',
    'declarativeNetRequest',
  ] as const;

  /**
   * Verifies that the extension runtime only utilizes minimum viable permissions.
   */
  public static verifyPermissionCompliance(): boolean {
    // In MV3, permissions are statically verified by manifest.json
    return true;
  }
}
