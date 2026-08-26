# MemShift Security Architecture & Threat Model

## 1. Security Architecture Principles

### 1.1 The Untrusted Client Model
The browser extension executes in an untrusted end-user environment. Consequently:
- **No Private Secrets in Client Bundles**: `SUPABASE_SERVICE_ROLE_KEY`, OpenAI/Anthropic/Gemini API keys, and database passwords are **never** present in the extension repository, build artifacts, or environment variables.
- **Client Identity Verification**: The server never trusts a client-supplied `user_id`. The user identity is cryptographically resolved solely from the validated Supabase Auth JWT (`auth.uid()`).
- **Server-Side Validation**: All data constraints, length limits, and foreign key references are enforced by PostgreSQL constraints and Edge Function schemas.

---

## 2. Threat Analysis & Mitigations

| Threat Vector | Potential Impact | MemShift Architectural Mitigation |
|---|---|---|
| **Credential Theft via Content Script Injection** | Malicious page scripts stealing auth tokens | Tokens are stored exclusively in `chrome.storage.local` within the extension background sandbox. Content scripts receive zero auth tokens and cannot make network calls. |
| **Cross-User Data Access (BOLA / IDOR)** | User querying or modifying another user's memories | Supabase PostgreSQL **Row Level Security (RLS)** is enabled on 100% of tables, mandating `user_id = auth.uid()` for all SQL operations. |
| **DOM-based XSS in Popup** | Malicious page title or excerpt executing scripts in extension | Strict React JSX text escaping; no `eval()`, `new Function()`, or `dangerouslySetInnerHTML` on untrusted inputs. |
| **Data Exfiltration via Third-Party Network Calls** | Content leak to third-party endpoints | Manifest V3 strict CSP; zero network permissions in content scripts; API client only communicates with the configured Supabase endpoint. |
| **Malformed Payload Denial of Service** | Extremely large text payloads crashing search/storage | Strict size truncation: Title <= 500 chars, Description <= 2,000 chars, Article Body <= 50,000 chars, Transcript <= 100,000 chars. |

---

## 3. Row Level Security (RLS) Specification

All tables implement strict Row Level Security. Example policy for `captures`:

```sql
ALTER TABLE public.captures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own captures"
    ON public.captures FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own captures"
    ON public.captures FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own captures"
    ON public.captures FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own captures"
    ON public.captures FOR DELETE
    USING (auth.uid() = user_id);
```

---

## 4. Content Security Policy (CSP)

MemShift operates under Manifest V3 default CSP:
```text
script-src 'self'; object-src 'self';
```
- Remote scripts are blocked.
- Inline script tags are prohibited.
- Dynamic code generation (`eval()`, `setTimeout(string)`) is blocked.
