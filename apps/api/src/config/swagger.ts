const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const parameter = (name: string, description: string) => ({
  name,
  in: 'path',
  required: true,
  description,
  schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
});
const queryParameter = (name: string, schema: Record<string, unknown>, description: string) => ({
  name,
  in: 'query',
  required: false,
  description,
  schema,
});
const requestBody = (schema: string, required = true) => ({ required, content: { 'application/json': { schema: ref(schema) } } });
const response = (description: string, schema?: string, contentType = 'application/json') =>
  schema
    ? { description, content: { [contentType]: { schema: ref(schema) } } }
    : contentType === 'application/json'
      ? { description }
      : { description, content: { [contentType]: { schema: { type: 'string', format: 'binary' } } } };
const errors = {
  '400': response('Validation error', 'Error'),
  '401': response('Authentication required', 'Error'),
  '403': response('Forbidden', 'Error'),
  '404': response('Resource not found', 'Error'),
};
const secured = (responses: Record<string, unknown>, _security = [{ cookieAuth: [] }, { apiKeyAuth: [] }]) => ({ ...responses, ...errors });

export const openapiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'LinkForge API',
    version: '0.2.0',
    description:
      'LinkForge link management, redirect, analytics, and administration API. Browser clients use secure cookies; integrations use scoped API keys.',
  },
  servers: [{ url: '/', description: 'Current API origin' }],
  security: [{ cookieAuth: [] }, { apiKeyAuth: [] }],
  tags: [
    { name: 'Health', description: 'Service health and API contract metadata' },
    { name: 'Auth', description: 'Registration, sessions, password recovery, and CSRF' },
    { name: 'Workspaces', description: 'Workspace and membership management' },
    { name: 'Links', description: 'Short links, QR codes, and link analytics' },
    { name: 'Abuse', description: 'Public abuse reporting' },
    { name: 'API keys', description: 'Scoped automation credentials' },
    { name: 'Admin', description: 'Platform moderation and audit operations' },
    { name: 'Redirects', description: 'Public short-link resolution' },
  ],
  paths: {
    '/health': {
      get: { tags: ['Health'], summary: 'Check service health', security: [], responses: { '200': response('Service is healthy') } },
    },
    '/openapi.json': {
      get: {
        tags: ['Health'],
        summary: 'Get the OpenAPI document',
        security: [],
        responses: { '200': { description: 'OpenAPI document', content: { 'application/json': { schema: { type: 'object' } } } } },
      },
    },
    '/v1/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a user and send a verification code',
        description:
          'Creates a pending user account and sends a six-digit email verification code. An invitation token can defer workspace creation and attach the account to the invited workspace after verification.',
        security: [],
        requestBody: requestBody('RegisterRequest'),
        responses: {
          '201': response('Verification code sent', 'AuthRegisterResponse'),
          '400': errors['400'],
          '404': response('Invitation not found or expired', 'Error'),
          '409': response('Email already exists', 'Error'),
        },
      },
    },
    '/v1/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Create a browser session',
        security: [],
        requestBody: requestBody('LoginRequest'),
        responses: {
          '200': response('Authenticated', 'AuthLoginResponse'),
          '400': errors['400'],
          '401': response('Invalid credentials', 'Error'),
          '403': response('Email verification required', 'Error'),
        },
      },
    },
    '/v1/auth/verify-email': {
      post: {
        tags: ['Auth'],
        summary: 'Verify an email with an OTP',
        description:
          'Validates the six-digit, time-limited email verification code, activates the account, and creates the browser session.',
        security: [],
        requestBody: requestBody('VerifyEmailRequest'),
        responses: {
          '200': response('Email verified and authenticated', 'AuthVerifyEmailResponse'),
          '400': errors['400'],
          '401': response('Invalid or expired code', 'Error'),
          '429': response('Too many verification attempts', 'Error'),
        },
      },
    },
    '/v1/auth/verify-email/resend': {
      post: {
        tags: ['Auth'],
        summary: 'Resend an email verification OTP',
        description:
          'Issues a new six-digit verification code for a pending account, subject to the resend cooldown. The response remains generic when the account does not exist.',
        security: [],
        requestBody: requestBody('ResetRequest'),
        responses: {
          '202': response('Verification request accepted', 'VerificationResendResponse'),
          '400': errors['400'],
          '429': response('Resend cooldown active', 'Error'),
        },
      },
    },
    '/v1/auth/password-reset/request': {
      post: {
        tags: ['Auth'],
        summary: 'Request a password reset',
        security: [],
        requestBody: requestBody('ResetRequest'),
        responses: { '202': response('Reset request accepted'), '400': errors['400'] },
      },
    },
    '/v1/auth/password-reset/confirm': {
      post: {
        tags: ['Auth'],
        summary: 'Set a new password with a reset token',
        security: [],
        requestBody: requestBody('ResetConfirmRequest'),
        responses: {
          '200': response('Password updated', 'UserResponse'),
          '400': errors['400'],
          '401': response('Invalid or expired token', 'Error'),
        },
      },
    },
    '/v1/auth/csrf': {
      get: {
        tags: ['Auth'],
        summary: 'Get a CSRF token',
        security: [{ cookieAuth: [] }],
        responses: { '200': response('CSRF token', 'CsrfResponse'), ...errors },
      },
    },
    '/v1/auth/me': {
      get: { tags: ['Auth'], summary: 'Get the current user', responses: secured({ '200': response('Current user', 'UserResponse') }) },
    },
    '/v1/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Rotate the current session',
        security: [{ cookieAuth: [] }],
        responses: secured({ '200': response('Session rotated', 'SessionResponse') }, [{ cookieAuth: [] }]),
      },
    },
    '/v1/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Revoke the current session',
        security: [{ cookieAuth: [] }],
        responses: secured({ '200': response('Signed out') }, [{ cookieAuth: [] }]),
      },
    },
    '/v1/auth/logout-all': {
      post: {
        tags: ['Auth'],
        summary: 'Revoke all sessions',
        security: [{ cookieAuth: [] }],
        responses: secured({ '200': response('All sessions revoked') }, [{ cookieAuth: [] }]),
      },
    },
    '/v1/auth/sessions': {
      get: {
        tags: ['Auth'],
        summary: 'List active sessions',
        security: [{ cookieAuth: [] }],
        responses: secured({ '200': response('Active sessions', 'SessionsResponse') }, [{ cookieAuth: [] }]),
      },
    },
    '/v1/auth/sessions/{sessionID}': {
      delete: {
        tags: ['Auth'],
        summary: 'Revoke one session',
        security: [{ cookieAuth: [] }],
        parameters: [parameter('sessionID', 'Session identifier')],
        responses: secured({ '200': response('Session revoked') }, [{ cookieAuth: [] }]),
      },
    },
    '/v1/workspaces': {
      get: {
        tags: ['Workspaces'],
        summary: "List the current user's workspaces",
        responses: secured({ '200': response('Workspaces', 'WorkspacesResponse') }),
      },
      post: {
        tags: ['Workspaces'],
        summary: 'Create a workspace',
        security: [{ cookieAuth: [] }],
        requestBody: requestBody('WorkspaceRequest'),
        responses: secured({ '201': response('Workspace created', 'WorkspaceResponse') }, [{ cookieAuth: [] }]),
      },
    },
    '/v1/workspaces/{workspaceID}': {
      get: {
        tags: ['Workspaces'],
        summary: 'Get a workspace and membership',
        parameters: [parameter('workspaceID', 'Workspace identifier')],
        responses: secured({ '200': response('Workspace', 'WorkspaceDetailResponse') }),
      },
      patch: {
        tags: ['Workspaces'],
        summary: 'Update a workspace',
        security: [{ cookieAuth: [] }],
        parameters: [parameter('workspaceID', 'Workspace identifier')],
        requestBody: requestBody('WorkspaceRequest'),
        responses: secured({ '200': response('Workspace updated', 'WorkspaceResponse') }, [{ cookieAuth: [] }]),
      },
    },
    '/v1/workspaces/{workspaceID}/members': {
      get: {
        tags: ['Workspaces'],
        summary: 'List workspace members',
        parameters: [parameter('workspaceID', 'Workspace identifier')],
        responses: secured({ '200': response('Members', 'MembersResponse') }),
      },
      post: {
        tags: ['Workspaces'],
        summary: 'Add a user to a workspace',
        security: [{ cookieAuth: [] }],
        parameters: [parameter('workspaceID', 'Workspace identifier')],
        requestBody: requestBody('MemberRequest'),
        responses: secured({ '201': response('Member added', 'MemberResponse') }, [{ cookieAuth: [] }]),
      },
    },
    '/v1/workspaces/{workspaceID}/members/{userID}': {
      patch: {
        tags: ['Workspaces'],
        summary: 'Update a member role',
        security: [{ cookieAuth: [] }],
        parameters: [parameter('workspaceID', 'Workspace identifier'), parameter('userID', 'User identifier')],
        requestBody: requestBody('MemberRequest'),
        responses: secured({ '200': response('Member updated', 'MemberResponse') }, [{ cookieAuth: [] }]),
      },
      delete: {
        tags: ['Workspaces'],
        summary: 'Remove a member',
        security: [{ cookieAuth: [] }],
        parameters: [parameter('workspaceID', 'Workspace identifier'), parameter('userID', 'User identifier')],
        responses: secured({ '200': response('Member removed') }, [{ cookieAuth: [] }]),
      },
    },
    '/v1/workspaces/{workspaceID}/invitations': {
      get: {
        tags: ['Workspaces'],
        summary: 'List pending workspace invitations',
        description:
          'Lists active, unexpired invitations for administrators of the workspace. Invitation token hashes are never included in the response.',
        parameters: [parameter('workspaceID', 'Workspace identifier')],
        responses: secured({ '200': response('Pending invitations', 'InvitationsResponse') }),
      },
      post: {
        tags: ['Workspaces'],
        summary: 'Invite a user by email',
        description:
          'Creates or refreshes a workspace invitation and sends an email link. The recipient may register first or accept with an existing LinkForge account.',
        security: [{ cookieAuth: [] }],
        parameters: [parameter('workspaceID', 'Workspace identifier')],
        requestBody: requestBody('InvitationRequest'),
        responses: secured({ '201': response('Invitation sent', 'InvitationResponse') }, [{ cookieAuth: [] }]),
      },
    },
    '/v1/workspaces/{workspaceID}/invitations/{invitationID}': {
      delete: {
        tags: ['Workspaces'],
        summary: 'Revoke a workspace invitation',
        description: 'Revokes a pending invitation. Any previously emailed link will stop working immediately.',
        security: [{ cookieAuth: [] }],
        parameters: [parameter('workspaceID', 'Workspace identifier'), parameter('invitationID', 'Invitation identifier')],
        responses: secured({ '200': response('Invitation revoked') }, [{ cookieAuth: [] }]),
      },
    },
    '/v1/invitations/{token}': {
      get: {
        tags: ['Workspaces'],
        summary: 'Inspect a workspace invitation',
        description:
          'Returns safe invitation details and whether the invited email already has an account, allowing the onboarding page to show the correct sign-in or registration action.',
        security: [],
        parameters: [{ name: 'token', in: 'path', required: true, schema: { type: 'string', minLength: 32 } }],
        responses: { '200': response('Invitation details', 'PublicInvitationResponse'), '404': errors['404'] },
      },
    },
    '/v1/invitations/accept': {
      post: {
        tags: ['Workspaces'],
        summary: 'Accept a workspace invitation',
        description: "Accepts an invitation for the authenticated user's matching email and adds that user to the workspace.",
        security: [{ cookieAuth: [] }],
        requestBody: requestBody('InvitationTokenRequest'),
        responses: secured({ '200': response('Invitation accepted', 'InvitationAcceptResponse') }, [{ cookieAuth: [] }]),
      },
    },
    '/v1/workspaces/{workspaceID}/links': {
      get: {
        tags: ['Links'],
        summary: 'List workspace links',
        parameters: [
          parameter('workspaceID', 'Workspace identifier'),
          queryParameter('page', { type: 'integer', minimum: 1, default: 1 }, 'Page number'),
          queryParameter('page_size', { type: 'integer', minimum: 1, maximum: 100, default: 20 }, 'Page size'),
          queryParameter('search', { type: 'string' }, 'Search links'),
          queryParameter('state', { type: 'string' }, 'Filter by state'),
        ],
        responses: secured({ '200': response('Links', 'LinksResponse') }),
      },
      post: {
        tags: ['Links'],
        summary: 'Create a short link',
        parameters: [parameter('workspaceID', 'Workspace identifier')],
        requestBody: requestBody('CreateLinkRequest'),
        responses: secured({ '201': response('Link created', 'LinkResponse') }),
      },
    },
    '/v1/links/{linkID}': {
      get: {
        tags: ['Links'],
        summary: 'Get a link',
        parameters: [parameter('linkID', 'Link identifier')],
        responses: secured({ '200': response('Link', 'LinkResponse') }),
      },
      patch: {
        tags: ['Links'],
        summary: 'Update a link',
        parameters: [parameter('linkID', 'Link identifier')],
        requestBody: requestBody('UpdateLinkRequest'),
        responses: secured({ '200': response('Link updated', 'LinkResponse') }),
      },
      delete: {
        tags: ['Links'],
        summary: 'Soft-delete a link',
        parameters: [parameter('linkID', 'Link identifier')],
        responses: secured({ '200': response('Link deleted') }),
      },
    },
    '/v1/links/{linkID}/pause': {
      post: {
        tags: ['Links'],
        summary: 'Pause a link',
        parameters: [parameter('linkID', 'Link identifier')],
        responses: secured({ '200': response('Link paused', 'LinkResponse') }),
      },
    },
    '/v1/links/{linkID}/restore': {
      post: {
        tags: ['Links'],
        summary: 'Restore a paused link',
        parameters: [parameter('linkID', 'Link identifier')],
        responses: secured({ '200': response('Link restored', 'LinkResponse') }),
      },
    },
    '/v1/links/{linkID}/analytics': {
      get: {
        tags: ['Links'],
        summary: 'Get link analytics',
        parameters: [
          parameter('linkID', 'Link identifier'),
          queryParameter('from', { type: 'string', format: 'date' }, 'Inclusive start date'),
          queryParameter('to', { type: 'string', format: 'date' }, 'End date'),
        ],
        responses: secured({ '200': response('Analytics summary', 'AnalyticsSummary') }),
      },
    },
    '/v1/links/{linkID}/qr': {
      get: {
        tags: ['Links'],
        summary: 'Generate a PNG QR code',
        parameters: [parameter('linkID', 'Link identifier')],
        responses: secured({ '200': response('PNG QR code', undefined, 'image/png') }),
      },
    },
    '/v1/links/{linkID}/abuse-reports': {
      post: {
        tags: ['Abuse'],
        summary: 'Report a link for abuse',
        security: [],
        parameters: [parameter('linkID', 'Link identifier')],
        requestBody: requestBody('AbuseRequest'),
        responses: { '202': response('Report accepted'), '400': errors['400'], '404': errors['404'] },
      },
    },
    '/v1/workspaces/{workspaceID}/api-keys': {
      get: {
        tags: ['API keys'],
        summary: 'List workspace API keys',
        security: [{ cookieAuth: [] }],
        parameters: [parameter('workspaceID', 'Workspace identifier')],
        responses: secured({ '200': response('API keys', 'ApiKeysResponse') }, [{ cookieAuth: [] }]),
      },
      post: {
        tags: ['API keys'],
        summary: 'Create a workspace API key',
        security: [{ cookieAuth: [] }],
        parameters: [parameter('workspaceID', 'Workspace identifier')],
        requestBody: requestBody('ApiKeyRequest'),
        responses: secured({ '201': response('API key created; secret returned once', 'ApiKeyCreatedResponse') }, [{ cookieAuth: [] }]),
      },
    },
    '/v1/workspaces/{workspaceID}/api-keys/{keyID}': {
      delete: {
        tags: ['API keys'],
        summary: 'Revoke a workspace API key',
        security: [{ cookieAuth: [] }],
        parameters: [parameter('workspaceID', 'Workspace identifier'), parameter('keyID', 'API key identifier')],
        responses: secured({ '200': response('API key revoked') }, [{ cookieAuth: [] }]),
      },
    },
    '/v1/admin/overview': {
      get: {
        tags: ['Admin'],
        summary: 'Get platform counts',
        security: [{ cookieAuth: [] }],
        responses: secured({ '200': response('Platform overview', 'AdminOverviewResponse') }, [{ cookieAuth: [] }]),
      },
    },
    '/v1/admin/users': {
      get: {
        tags: ['Admin'],
        summary: 'List users',
        security: [{ cookieAuth: [] }],
        parameters: [
          queryParameter('page', { type: 'integer', minimum: 1 }, 'Page number'),
          queryParameter('page_size', { type: 'integer', maximum: 100 }, 'Page size'),
          queryParameter('search', { type: 'string' }, 'Search users'),
        ],
        responses: secured({ '200': response('Users', 'UsersResponse') }, [{ cookieAuth: [] }]),
      },
    },
    '/v1/admin/workspaces': {
      get: {
        tags: ['Admin'],
        summary: 'List all workspaces',
        security: [{ cookieAuth: [] }],
        responses: secured({ '200': response('Workspaces', 'AdminWorkspacesResponse') }, [{ cookieAuth: [] }]),
      },
    },
    '/v1/admin/links': {
      get: {
        tags: ['Admin'],
        summary: 'List all platform links',
        security: [{ cookieAuth: [] }],
        parameters: [
          queryParameter('page', { type: 'integer', minimum: 1 }, 'Page number'),
          queryParameter('page_size', { type: 'integer', maximum: 100 }, 'Page size'),
          queryParameter('search', { type: 'string' }, 'Search by hostname, slug, destination, title, or campaign'),
          queryParameter('state', { type: 'string', enum: ['active', 'paused', 'expired', 'quarantined', 'deleted'] }, 'Link state'),
        ],
        responses: secured({ '200': response('Platform links', 'AdminLinksResponse') }, [{ cookieAuth: [] }]),
      },
    },
    '/v1/admin/audit-logs': {
      get: {
        tags: ['Admin'],
        summary: 'List audit logs',
        security: [{ cookieAuth: [] }],
        responses: secured({ '200': response('Audit logs', 'AuditLogsResponse') }, [{ cookieAuth: [] }]),
      },
    },
    '/v1/admin/abuse-reports': {
      get: {
        tags: ['Admin'],
        summary: 'List abuse reports',
        security: [{ cookieAuth: [] }],
        responses: secured({ '200': response('Abuse reports', 'AbuseReportsResponse') }, [{ cookieAuth: [] }]),
      },
    },
    '/v1/admin/abuse-reports/{reportID}': {
      patch: {
        tags: ['Admin'],
        summary: 'Update abuse report status',
        security: [{ cookieAuth: [] }],
        parameters: [parameter('reportID', 'Abuse report identifier')],
        requestBody: requestBody('AbuseUpdateRequest'),
        responses: secured({ '200': response('Abuse report updated') }, [{ cookieAuth: [] }]),
      },
    },
    '/v1/admin/blocked-destinations': {
      get: {
        tags: ['Admin'],
        summary: 'List blocked destination patterns',
        security: [{ cookieAuth: [] }],
        responses: secured({ '200': response('Blocked destinations', 'BlockedDestinationsResponse') }, [{ cookieAuth: [] }]),
      },
      post: {
        tags: ['Admin'],
        summary: 'Block a destination pattern',
        security: [{ cookieAuth: [] }],
        requestBody: requestBody('BlockRequest'),
        responses: secured({ '201': response('Destination blocked') }, [{ cookieAuth: [] }]),
      },
    },
    '/v1/admin/links/{linkID}/quarantine': {
      post: {
        tags: ['Admin'],
        summary: 'Quarantine a link',
        security: [{ cookieAuth: [] }],
        parameters: [parameter('linkID', 'Link identifier')],
        responses: secured({ '200': response('Link quarantined', 'LinkResponse') }, [{ cookieAuth: [] }]),
      },
    },
    '/r/{slug}': {
      get: {
        tags: ['Redirects'],
        summary: 'Resolve a short link',
        security: [],
        parameters: [
          { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'password', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '301': { description: 'Permanent redirect' },
          '302': { description: 'Temporary redirect' },
          '307': { description: 'Temporary redirect' },
          '308': { description: 'Permanent redirect' },
          '401': response('Password required', 'Error'),
          '404': errors['404'],
        },
      },
      head: {
        tags: ['Redirects'],
        summary: 'Resolve a short link without a body',
        security: [],
        parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '301': { description: 'Permanent redirect' }, '302': { description: 'Temporary redirect' }, '404': errors['404'] },
      },
    },
    '/{slug}': {
      get: {
        tags: ['Redirects'],
        summary: 'Resolve a short link on the default domain',
        security: [],
        parameters: [
          { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'password', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '301': { description: 'Permanent redirect' },
          '302': { description: 'Temporary redirect' },
          '307': { description: 'Temporary redirect' },
          '308': { description: 'Permanent redirect' },
          '401': response('Password required', 'Error'),
          '404': errors['404'],
        },
      },
      head: {
        tags: ['Redirects'],
        summary: 'Resolve a short link without a body',
        security: [],
        parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '301': { description: 'Permanent redirect' }, '302': { description: 'Temporary redirect' }, '404': errors['404'] },
      },
    },
  },
  components: {
    securitySchemes: {
      cookieAuth: { type: 'apiKey', in: 'cookie', name: 'linkforge_session', description: 'HttpOnly browser session cookie' },
      apiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key', description: 'Scoped LinkForge API key' },
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['error'],
        properties: {
          error: {
            type: 'object',
            required: ['code', 'message'],
            properties: { code: { type: 'string' }, message: { type: 'string' }, request_id: { type: 'string' } },
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string', format: 'email' },
          display_name: { type: 'string' },
          status: { type: 'string', enum: ['active', 'pending', 'suspended', 'deleted'] },
          is_platform_admin: { type: 'boolean' },
          email_verified_at: { type: 'string', format: 'date-time' },
        },
      },
      Session: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          device_label: { type: 'string' },
          created_at: { type: 'string', format: 'date-time' },
          last_used_at: { type: 'string', format: 'date-time' },
          expires_at: { type: 'string', format: 'date-time' },
        },
      },
      Workspace: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          slug: { type: 'string' },
          plan: { type: 'string' },
          status: { type: 'string', enum: ['active', 'suspended'] },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      Member: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          workspace_id: { type: 'string' },
          user_id: { type: 'string' },
          role: { type: 'string', enum: ['owner', 'admin', 'editor', 'analyst', 'viewer'] },
          permissions: { type: 'array', items: { type: 'string' } },
          user: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string', format: 'email' },
              display_name: { type: 'string' },
              status: { type: 'string' },
            },
          },
        },
      },
      RoutingRule: {
        type: 'object',
        required: ['destination'],
        properties: {
          id: { type: 'string' },
          priority: { type: 'integer' },
          country_codes: { type: 'array', items: { type: 'string' } },
          device_classes: { type: 'array', items: { type: 'string' } },
          os_names: { type: 'array', items: { type: 'string' } },
          language_codes: { type: 'array', items: { type: 'string' } },
          destination: { type: 'string', format: 'uri', pattern: '^https?://' },
          enabled: { type: 'boolean' },
        },
      },
      Link: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          workspace_id: { type: 'string' },
          hostname: { type: 'string' },
          slug: { type: 'string' },
          destination_url: { type: 'string', format: 'uri' },
          redirect_status: { type: 'integer', enum: [301, 302, 307, 308] },
          state: { type: 'string', enum: ['active', 'paused', 'expired', 'quarantined', 'deleted'] },
          title: { type: 'string' },
          description: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          folder: { type: 'string' },
          campaign: { type: 'string' },
          expires_at: { type: 'string', format: 'date-time' },
          max_clicks: { type: 'integer' },
          click_count: { type: 'integer' },
          routing_rules: { type: 'array', items: ref('RoutingRule') },
          qr: ref('QrConfig'),
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      QrConfig: {
        type: 'object',
        properties: {
          foreground: { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' },
          background: { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' },
          size: { type: 'integer', minimum: 64, maximum: 2048 },
        },
      },
      ApiKey: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          workspace_id: { type: 'string' },
          name: { type: 'string' },
          prefix: { type: 'string' },
          scopes: { type: 'array', items: { type: 'string' } },
          expires_at: { type: 'string', format: 'date-time' },
          last_used_at: { type: 'string', format: 'date-time' },
        },
      },
      AnalyticsSummary: {
        type: 'object',
        properties: {
          clicks: { type: 'integer' },
          unique_clicks: { type: 'integer' },
          by_day: {
            type: 'array',
            items: { type: 'object', properties: { date: { type: 'string', format: 'date' }, clicks: { type: 'integer' } } },
          },
          by_country: { type: 'array', items: { $ref: '#/components/schemas/MetricBreakdown' } },
          by_device: { type: 'array', items: { $ref: '#/components/schemas/MetricBreakdown' } },
          by_referrer: { type: 'array', items: { $ref: '#/components/schemas/MetricBreakdown' } },
        },
      },
      MetricBreakdown: { type: 'object', properties: { name: { type: 'string' }, count: { type: 'integer' } } },
      Pagination: { type: 'object', properties: { page: { type: 'integer' }, page_size: { type: 'integer' }, total: { type: 'integer' } } },
      RegisterRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 12, maxLength: 256, format: 'password' },
          display_name: { type: 'string', maxLength: 80 },
          device_label: { type: 'string', maxLength: 120 },
          invitation_token: {
            type: 'string',
            minLength: 32,
            maxLength: 512,
            description: 'Optional invitation token used to associate the new account with a workspace after email verification.',
          },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', format: 'password' },
          device_label: { type: 'string', maxLength: 120 },
        },
      },
      TokenRequest: { type: 'object', required: ['token'], properties: { token: { type: 'string', minLength: 1 } } },
      VerifyEmailRequest: {
        type: 'object',
        required: ['email', 'code'],
        properties: {
          email: { type: 'string', format: 'email' },
          code: { type: 'string', pattern: '^[0-9]{6}$', description: 'Six-digit email OTP' },
          invitation_token: {
            type: 'string',
            minLength: 32,
            description: 'Optional invitation token to accept immediately after verification',
          },
        },
      },
      InvitationRequest: {
        type: 'object',
        required: ['email', 'role'],
        properties: {
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['admin', 'editor', 'analyst', 'viewer'] },
        },
      },
      InvitationTokenRequest: { type: 'object', required: ['token'], properties: { token: { type: 'string', minLength: 32 } } },
      Invitation: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          workspace_id: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['admin', 'editor', 'analyst', 'viewer'] },
          status: { type: 'string', enum: ['pending', 'accepted', 'revoked', 'expired'] },
          invited_by: { type: 'string' },
          expires_at: { type: 'string', format: 'date-time' },
        },
      },
      ResetRequest: { type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email' } } },
      ResetConfirmRequest: {
        type: 'object',
        required: ['token', 'password'],
        properties: { token: { type: 'string' }, password: { type: 'string', minLength: 12, format: 'password' } },
      },
      WorkspaceRequest: { type: 'object', required: ['name'], properties: { name: { type: 'string', minLength: 1, maxLength: 80 } } },
      MemberRequest: {
        type: 'object',
        required: ['role'],
        properties: {
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['owner', 'admin', 'editor', 'analyst', 'viewer'] },
          permissions: { type: 'array', items: { type: 'string', maxLength: 80 } },
        },
      },
      LinkWriteFields: {
        type: 'object',
        properties: {
          destination_url: { type: 'string', format: 'uri', pattern: '^https?://' },
          slug: { type: 'string', maxLength: 50 },
          redirect_status: { type: 'integer', enum: [301, 302, 307, 308], default: 302 },
          title: { type: 'string', maxLength: 200 },
          description: { type: 'string', maxLength: 1000 },
          tags: { type: 'array', items: { type: 'string', maxLength: 64 } },
          folder: { type: 'string', maxLength: 120 },
          campaign: { type: 'string', maxLength: 120 },
          expires_at: { type: 'string', format: 'date-time' },
          max_clicks: { type: 'integer', minimum: 0 },
          password: { type: 'string', minLength: 8, maxLength: 128, format: 'password' },
          routing_rules: { type: 'array', maxItems: 50, items: ref('RoutingRule') },
          qr: ref('QrConfig'),
        },
      },
      CreateLinkRequest: { allOf: [{ $ref: '#/components/schemas/LinkWriteFields' }], required: ['destination_url'] },
      UpdateLinkRequest: {
        allOf: [
          { $ref: '#/components/schemas/LinkWriteFields' },
          {
            type: 'object',
            properties: {
              state: { type: 'string', enum: ['active', 'paused', 'quarantined'] },
              password: { type: 'string', nullable: true },
            },
          },
        ],
      },
      ApiKeyRequest: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 80 },
          scopes: { type: 'array', items: { type: 'string', maxLength: 80 } },
          expires_at: { type: 'string', format: 'date-time' },
        },
      },
      AbuseRequest: {
        type: 'object',
        required: ['reason'],
        properties: { reason: { type: 'string', minLength: 3, maxLength: 120 }, details: { type: 'string', maxLength: 4000 } },
      },
      AbuseUpdateRequest: {
        type: 'object',
        required: ['status'],
        properties: { status: { type: 'string', enum: ['open', 'reviewing', 'resolved', 'dismissed'] } },
      },
      BlockRequest: {
        type: 'object',
        required: ['pattern'],
        properties: { pattern: { type: 'string', minLength: 1, maxLength: 4096 }, reason: { type: 'string', maxLength: 500 } },
      },
      AuthRegisterResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'object',
            properties: {
              user: ref('User'),
              workspace: ref('Workspace'),
              verification_expires_at: { type: 'string', format: 'date-time' },
              development_verification_code: { type: 'string', pattern: '^[0-9]{6}$' },
            },
          },
          request_id: { type: 'string' },
        },
      },
      AuthLoginResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'object',
            properties: { user: ref('User'), session: ref('Session'), development_session_token: { type: 'string' } },
          },
          request_id: { type: 'string' },
        },
      },
      AuthVerifyEmailResponse: {
        type: 'object',
        properties: {
          data: { type: 'object', properties: { user: ref('User'), workspace: ref('Workspace'), session: ref('Session') } },
          request_id: { type: 'string' },
        },
      },
      VerificationResendResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              verification_expires_at: { type: 'string', format: 'date-time' },
              development_verification_code: { type: 'string', pattern: '^[0-9]{6}$' },
            },
          },
          request_id: { type: 'string' },
        },
      },
      InvitationResponse: {
        type: 'object',
        properties: {
          data: { type: 'object', properties: { invitation: ref('Invitation'), development_invitation_token: { type: 'string' } } },
          request_id: { type: 'string' },
        },
      },
      InvitationsResponse: {
        type: 'object',
        properties: {
          data: { type: 'object', properties: { invitations: { type: 'array', items: ref('Invitation') } } },
          request_id: { type: 'string' },
        },
      },
      PublicInvitationResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'object',
            properties: {
              invitation: ref('Invitation'),
              workspace: ref('Workspace'),
              account_exists: {
                type: 'boolean',
                description: 'Whether the invited email already belongs to a LinkForge account.',
              },
            },
          },
          request_id: { type: 'string' },
        },
      },
      InvitationAcceptResponse: {
        type: 'object',
        properties: { data: { type: 'object', properties: { workspace: ref('Workspace') } }, request_id: { type: 'string' } },
      },
      UserResponse: {
        type: 'object',
        properties: { data: { type: 'object', properties: { user: ref('User') } }, request_id: { type: 'string' } },
      },
      SessionResponse: {
        type: 'object',
        properties: {
          data: { type: 'object', properties: { session: ref('Session'), development_session_token: { type: 'string' } } },
          request_id: { type: 'string' },
        },
      },
      SessionsResponse: {
        type: 'object',
        properties: {
          data: { type: 'object', properties: { sessions: { type: 'array', items: ref('Session') } } },
          request_id: { type: 'string' },
        },
      },
      CsrfResponse: {
        type: 'object',
        properties: { data: { type: 'object', properties: { csrf_token: { type: 'string' } } }, request_id: { type: 'string' } },
      },
      WorkspaceResponse: {
        type: 'object',
        properties: { data: { type: 'object', properties: { workspace: ref('Workspace') } }, request_id: { type: 'string' } },
      },
      WorkspaceDetailResponse: {
        type: 'object',
        properties: {
          data: { type: 'object', properties: { workspace: ref('Workspace'), membership: ref('Member') } },
          request_id: { type: 'string' },
        },
      },
      WorkspacesResponse: {
        type: 'object',
        properties: {
          data: { type: 'object', properties: { workspaces: { type: 'array', items: ref('Workspace') } } },
          request_id: { type: 'string' },
        },
      },
      MembersResponse: {
        type: 'object',
        properties: {
          data: { type: 'object', properties: { members: { type: 'array', items: ref('Member') } } },
          request_id: { type: 'string' },
        },
      },
      MemberResponse: {
        type: 'object',
        properties: { data: { type: 'object', properties: { member: ref('Member') } }, request_id: { type: 'string' } },
      },
      LinkResponse: {
        type: 'object',
        properties: {
          data: { type: 'object', properties: { link: ref('Link'), short_url: { type: 'string', format: 'uri' } } },
          request_id: { type: 'string' },
        },
      },
      LinksResponse: {
        type: 'object',
        properties: {
          data: { type: 'object', properties: { links: { type: 'array', items: ref('Link') }, pagination: ref('Pagination') } },
          request_id: { type: 'string' },
        },
      },
      ApiKeysResponse: {
        type: 'object',
        properties: {
          data: { type: 'object', properties: { api_keys: { type: 'array', items: ref('ApiKey') } } },
          request_id: { type: 'string' },
        },
      },
      ApiKeyCreatedResponse: {
        type: 'object',
        properties: {
          data: { type: 'object', properties: { api_key: ref('ApiKey'), secret: { type: 'string' }, warning: { type: 'string' } } },
          request_id: { type: 'string' },
        },
      },
      AdminOverviewResponse: {
        type: 'object',
        properties: { data: { type: 'object', additionalProperties: { type: 'integer' } }, request_id: { type: 'string' } },
      },
      UsersResponse: {
        type: 'object',
        properties: {
          data: { type: 'object', properties: { users: { type: 'array', items: ref('User') }, total: { type: 'integer' } } },
          request_id: { type: 'string' },
        },
      },
      AdminWorkspacesResponse: {
        type: 'object',
        properties: {
          data: { type: 'object', properties: { workspaces: { type: 'array', items: ref('Workspace') }, total: { type: 'integer' } } },
          request_id: { type: 'string' },
        },
      },
      AdminLinksResponse: {
        type: 'object',
        properties: {
          data: { type: 'object', properties: { links: { type: 'array', items: ref('Link') }, total: { type: 'integer' } } },
          request_id: { type: 'string' },
        },
      },
      AuditLogsResponse: {
        type: 'object',
        properties: {
          data: { type: 'object', properties: { audit_logs: { type: 'array', items: ref('AdminAuditLog') }, total: { type: 'integer' } } },
          request_id: { type: 'string' },
        },
      },
      AdminAuditLog: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          action: { type: 'string' },
          resource: { type: 'string' },
          created_at: { type: 'string', format: 'date-time' },
          actor: {
            type: 'object',
            properties: { display_name: { type: 'string' }, email: { type: 'string', format: 'email' } },
          },
          workspace: {
            type: 'object',
            properties: { name: { type: 'string' }, slug: { type: 'string' } },
          },
        },
      },
      AbuseReportsResponse: {
        type: 'object',
        properties: {
          data: { type: 'object', properties: { reports: { type: 'array', items: { type: 'object' } }, total: { type: 'integer' } } },
          request_id: { type: 'string' },
        },
      },
      BlockedDestinationsResponse: {
        type: 'object',
        properties: {
          data: { type: 'object', properties: { blocked_destinations: { type: 'array', items: { type: 'object' } } } },
          request_id: { type: 'string' },
        },
      },
    },
  },
} as const;

const operationDescriptions: Record<string, Record<string, string>> = {
  '/health': { get: 'Checks MongoDB connectivity and reports whether the API process is ready to serve requests.' },
  '/openapi.json': { get: 'Returns the machine-readable OpenAPI contract used by Swagger UI and client generators.' },
  '/v1/auth/register': {
    post: 'Creates a pending user account and default workspace, generates a six-digit OTP, sends it through the configured email provider, and waits for verification before creating a session.',
  },
  '/v1/auth/login': { post: 'Authenticates an active user with an email and password and rotates in a new browser session.' },
  '/v1/auth/verify-email': { post: 'Validates a six-digit, time-limited email OTP, activates the account, and creates a browser session.' },
  '/v1/auth/verify-email/resend': {
    post: 'Sends a replacement email verification OTP for a pending account while enforcing the resend cooldown.',
  },
  '/v1/auth/password-reset/request': { post: 'Accepts a password-reset request without revealing whether the email address exists.' },
  '/v1/auth/password-reset/confirm': { post: 'Validates a password-reset token, changes the password, and revokes existing sessions.' },
  '/v1/auth/csrf': { get: 'Returns the CSRF token required for state-changing requests authenticated with browser cookies.' },
  '/v1/auth/me': { get: 'Returns the authenticated user resolved from the session cookie or scoped API key.' },
  '/v1/auth/refresh': { post: 'Replaces the current browser session with a newly issued session and refreshes authentication cookies.' },
  '/v1/auth/logout': { post: 'Revokes the current browser session and clears the session and CSRF cookies.' },
  '/v1/auth/logout-all': { post: 'Revokes every active browser session belonging to the authenticated user.' },
  '/v1/auth/sessions': { get: "Lists the authenticated user's non-revoked and non-expired browser sessions." },
  '/v1/auth/sessions/{sessionID}': { delete: 'Revokes one browser session owned by the authenticated user.' },
  '/v1/workspaces': {
    get: 'Lists active workspaces where the authenticated user is a member.',
    post: 'Creates a new active workspace and makes the authenticated user its owner.',
  },
  '/v1/workspaces/{workspaceID}': {
    get: "Returns a workspace together with the authenticated user's membership and permissions.",
    patch: 'Updates the workspace display name for a workspace administrator and records the change in the audit log.',
  },
  '/v1/workspaces/{workspaceID}/members': {
    get: 'Lists all members of a workspace.',
    post: 'Adds an existing LinkForge user to the workspace with the requested role and permissions.',
  },
  '/v1/workspaces/{workspaceID}/members/{userID}': {
    patch: "Changes a workspace member's role and explicit permissions.",
    delete: 'Removes a non-owner member from the workspace.',
  },
  '/v1/workspaces/{workspaceID}/invitations': {
    get: 'Lists pending workspace invitations visible to workspace administrators.',
    post: 'Creates or refreshes an email invitation for a workspace role and sends the recipient an onboarding link.',
  },
  '/v1/workspaces/{workspaceID}/invitations/{invitationID}': {
    delete: 'Revokes a pending workspace invitation so its onboarding link can no longer be used.',
  },
  '/v1/invitations/{token}': {
    get: 'Returns safe invitation details and account availability without revealing the stored token hash.',
  },
  '/v1/invitations/accept': {
    post: "Accepts a pending invitation for the authenticated user's matching email and adds that user to the workspace.",
  },
  '/v1/workspaces/{workspaceID}/links': {
    get: 'Returns a paginated, searchable list of non-deleted links scoped to the workspace.',
    post: 'Creates a short link after validating the destination, slug, routing rules, and workspace permissions.',
  },
  '/v1/links/{linkID}': {
    get: 'Returns one link visible to the authenticated workspace member.',
    patch: 'Updates destination, metadata, routing, password, QR settings, or lifecycle state for a link.',
    delete: 'Soft-deletes a link while retaining its audit history.',
  },
  '/v1/links/{linkID}/pause': { post: 'Pauses link resolution without deleting the link or its analytics history.' },
  '/v1/links/{linkID}/restore': { post: 'Restores a paused link to the active state.' },
  '/v1/links/{linkID}/analytics': {
    get: 'Returns click totals and country, device, referrer, and daily breakdowns for a bounded date range.',
  },
  '/v1/links/{linkID}/qr': { get: 'Generates a PNG QR code for the link using its stored QR color and size settings.' },
  '/v1/links/{linkID}/abuse-reports': {
    post: 'Accepts an anonymous abuse report for an existing link; authentication is intentionally not required.',
  },
  '/v1/workspaces/{workspaceID}/api-keys': {
    get: 'Lists active API keys for a workspace without returning their secret material.',
    post: 'Creates a scoped workspace API key and returns its plaintext secret exactly once.',
  },
  '/v1/workspaces/{workspaceID}/api-keys/{keyID}': { delete: 'Revokes a workspace API key so it can no longer authenticate requests.' },
  '/v1/admin/overview': { get: 'Returns platform-wide counts for users, workspaces, links, click events, and abuse reports.' },
  '/v1/admin/users': { get: 'Returns a paginated, searchable list of users for platform administrators.' },
  '/v1/admin/workspaces': { get: 'Returns a paginated list of all workspaces for platform administrators.' },
  '/v1/admin/links': {
    get: 'Returns a paginated, searchable, and state-filterable list of every short link across every workspace for platform administrators.',
  },
  '/v1/admin/audit-logs': {
    get: 'Returns a paginated list of security and business audit events enriched with the acting user and workspace display details.',
  },
  '/v1/admin/abuse-reports': { get: 'Returns a paginated list of submitted abuse reports for moderation.' },
  '/v1/admin/abuse-reports/{reportID}': { patch: "Changes an abuse report's moderation status and records the administrative action." },
  '/v1/admin/blocked-destinations': {
    get: 'Lists blocked destination patterns used by link creation and update checks.',
    post: 'Adds a destination pattern to the platform blocklist.',
  },
  '/v1/admin/links/{linkID}/quarantine': { post: 'Quarantines a link so it can no longer resolve publicly while preserving its record.' },
  '/r/{slug}': {
    get: 'Resolves a short link on the explicit redirect route, records bounded analytics, and returns the configured redirect status.',
    head: 'Resolves a short link like GET but returns only redirect headers without a response body.',
  },
  '/{slug}': {
    get: 'Resolves a short link on the default short-link domain, including optional password protection and routing rules.',
    head: 'Resolves a default-domain short link like GET but returns only redirect headers without a response body.',
  },
};

for (const [path, methods] of Object.entries(operationDescriptions)) {
  const pathItem = openapiDocument.paths[path as keyof typeof openapiDocument.paths];
  if (!pathItem) continue;
  const mutablePathItem = pathItem as unknown as Record<string, { description?: string }>;
  for (const [method, description] of Object.entries(methods)) {
    if (mutablePathItem[method]) mutablePathItem[method].description = description;
  }
}
