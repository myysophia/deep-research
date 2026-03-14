# (Optional) Server API Access Password for enhanced security
ACCESS_PASSWORD=

# (Deprecated) Server-side Gemini API Proxy URL. Default, `https://generativelanguage.googleapis.com`
API_PROXY_BASE_URL=

# (Optional) Server-side Gemini API Key (Required for server API calls)
GOOGLE_GENERATIVE_AI_API_KEY=
# (Optional) Server-side Gemini API Proxy URL. Default, `https://generativelanguage.googleapis.com`
GOOGLE_GENERATIVE_AI_API_BASE_URL=

# (Optional) The Google Cloud project ID that you want to use for the API calls.
GOOGLE_VERTEX_PROJECT=
# (Optional) The Google Cloud location that you want to use for the API calls, e.g. us-central1.
GOOGLE_VERTEX_LOCATION=
# (Optional) The client email from the Google Cloud account.
GOOGLE_CLIENT_EMAIL=
# (Optional) The private key from the Google Cloud account
GOOGLE_PRIVATE_KEY=
# (Optional) The private key ID from the Google Cloud account
GOOGLE_PRIVATE_KEY_ID=

# (Optional) Server-side OpenRouter API Key (Required for server API calls)
OPENROUTER_API_KEY=
# (Optional) Server-side OpenRouter API Proxy URL. Default, `https://openrouter.ai/api`
OPENROUTER_API_BASE_URL=

# (Optional) Server-side OpenAI API Key (Required for server API calls)
OPENAI_API_KEY=
# (Optional) Server-side OpenAI API Proxy URL. Default, `https://api.openai.com`
OPENAI_API_BASE_URL=

# (Optional) Server-side Anthropic API Key (Required for server API calls)
ANTHROPIC_API_KEY=
# (Optional) Server-side Anthropic API Proxy URL. Default, `https://api.anthropic.com`
ANTHROPIC_API_BASE_URL=

# (Optional) Server-side DeepSeek API Key (Required for server API calls)
DEEPSEEK_API_KEY=
# (Optional) Server-side DeepSeek API Proxy URL. Default, `https://api.deepseek.com`
DEEPSEEK_API_BASE_URL=

# (Optional) Server-side XAI API Key (Required for server API calls)
XAI_API_KEY=
# (Optional) Server-side XAI API Proxy URL. Default, `https://api.x.ai`
XAI_API_BASE_URL=

# (Optional) Server-side Mistral API Key (Required for server API calls)
MISTRAL_API_KEY=
# (Optional) Server-side Mistral API Proxy URL. Default, `https://api.mistral.ai`
MISTRAL_API_BASE_URL=

# (Optional) Server-side Azure API Key (Required for server API calls)
AZURE_API_KEY=
# (Optional) Server-side Azure API Version.
AZURE_API_VERSION=
# (Optional) Server-side Azure Resource Name. The resource name is used in the assembled URL: `https://{AZURE_RESOURCE_NAME}.openai.azure.com/openai/deployments`
AZURE_RESOURCE_NAME=

# (Optional) Server-side Compatible with OpenAI API Key (Required for server API calls)
OPENAI_COMPATIBLE_API_KEY=
# (Optional) Server-side Compatible with OpenAI API Proxy URL.
# DashScope 示例: `https://dashscope.aliyuncs.com/compatible-mode`
OPENAI_COMPATIBLE_API_BASE_URL=

# (Optional) Server-side pollinations.ai API Proxy URL. Default, `https://text.pollinations.ai/openai`
POLLINATIONS_API_BASE_URL=

# (Optional) Server-side Ollama API Proxy URL. Default, `http://0.0.0.0:11434`
OLLAMA_API_BASE_URL=

# (Optional) Server-side Tavily API Key (Required for server API calls)
TAVILY_API_KEY=
# (Optional) Server-side Tavily API Proxy URL. Default, `https://api.tavily.com`
TAVILY_API_BASE_URL=

# (Optional) Server-side Firecrawl API Key (Required for server API calls)
FIRECRAWL_API_KEY=
# (Optional) Server-side Firecrawl API Proxy URL. Default, `https://api.firecrawl.dev`
FIRECRAWL_API_BASE_URL=

# (Optional) Server-side Exa API Key (Required for server API calls)
EXA_API_KEY=
# (Optional) Server-side Exa API Proxy URL. Default, `https://api.exa.ai`
EXA_API_BASE_URL=

# (Optional) Server-side Bocha API Key (Required for server API calls)
BOCHA_API_KEY=
# (Optional) Server-side Bocha API Proxy URL. Default, `https://api.bochaai.com`
BOCHA_API_BASE_URL=

# (Optional) Server-side Brave API Key (Required for server API calls)
BRAVE_API_KEY=
# (Optional) Server-side Brave API Proxy URL. Default, `https://api.search.brave.com/res`
BRAVE_API_BASE_URL=

# (Optional) Server-side Searxng API Proxy URL. Default, `http://0.0.0.0:8080`
SEARXNG_API_BASE_URL=

# (Optional) MCP Server AI provider
# Possible values ​​include: google, openai, anthropic, deepseek, xai, mistral, azure, openrouter, openaicompatible, pollinations, ollama
MCP_AI_PROVIDER=
# (Optional) MCP Server search provider. Default, `model`
# Possible values ​​include: model, tavily, firecrawl, exa, bocha, searxng
MCP_SEARCH_PROVIDER=
# (Optional) MCP Server thinking model id, the core model used in deep research.
MCP_THINKING_MODEL=
# (Optional) MCP Server task model id, used for secondary tasks, high output models are recommended.
MCP_TASK_MODEL=

# (Optional) Disable server-side AI provider usage permissions
# Possible values ​​include: google, openai, anthropic, deepseek, xai, mistral, azure, openrouter, openaicompatible, pollinations, ollama
NEXT_PUBLIC_DISABLED_AI_PROVIDER=
# (Optional) Disable server-side search provider usage permissions
# Possible values ​​include: model, tavily, firecrawl, exa, bocha, searxng
NEXT_PUBLIC_DISABLED_SEARCH_PROVIDER=
# (Optional) Customize the model list, add or delete models
NEXT_PUBLIC_MODEL_LIST=

# (Optional) Injected script code can be used for statistics or error tracking.
HEAD_SCRIPTS=

# ============================================
# SaaS MVP Configuration
# ============================================

# (Optional) Runtime environment selector for SaaS deployment
# Possible values: `dev`, `staging`, `prod`
APP_RUNTIME_ENV=dev

# (Optional) Enable SaaS MVP APIs (`/api/billing/*`, `/api/account/delete-request`)
# Possible values: `1` or `0`
SAAS_MVP_ENABLED=0

# (Optional) Enable development auth fallback (use `x-user-id` if Bearer token exists)
# Possible values: `1` or `0`
SAAS_MVP_DEV_MODE=0

# (Optional) Supabase URL (project environment specific)
SUPABASE_URL=

# (Optional) Supabase anonymous key (client safe)
SUPABASE_ANON_KEY=

# (Optional) Supabase service role key (server only)
SUPABASE_SERVICE_ROLE_KEY=

# (Optional) Supabase project reference (for ops/audit)
SUPABASE_PROJECT_REF=

# (Optional) Supabase Postgres connection string (server only)
SUPABASE_DB_URL=

# (Optional) Payment provider key, default `aggregator`
PAYMENT_PROVIDER=aggregator

# (Optional) Webhook signature secret for payment callback
PAYMENT_WEBHOOK_SECRET=

# (Optional) Comma-separated admin user id allowlist
ADMIN_USER_WHITELIST=

# ============================================
# OEM / Branding Configuration
# ============================================

# (Optional) Application name displayed in UI and browser tab
# Default: "AI论文撰写智能体"
NEXT_PUBLIC_APP_NAME=

# (Optional) Application title for SEO and browser display
# Default: Uses NEXT_PUBLIC_APP_NAME
NEXT_PUBLIC_APP_TITLE=

# (Optional) Application description for SEO and metadata
# Default: "AI-powered academic thesis writing assistant"
NEXT_PUBLIC_APP_DESCRIPTION=

# (Optional) Application logo path (relative to public folder)
# Default: "logo.svg"
NEXT_PUBLIC_APP_LOGO=

# (Optional) Theme color for PWA and browser UI
# Default: "#FFFFFF"
NEXT_PUBLIC_APP_THEME_COLOR=

# (Optional) Background color for PWA splash screen
# Default: "#FFFFFF"
NEXT_PUBLIC_APP_BACKGROUND_COLOR=

# (Optional) Application ID for PWA manifest
# Default: "ai-thesis-writer"
NEXT_PUBLIC_APP_ID=

# (Optional) Footer copyright text
# Default: "© 2025 AI Thesis Writer. All rights reserved."
NEXT_PUBLIC_APP_FOOTER=

# (Optional) Repository URL for footer link
# Default: ""
NEXT_PUBLIC_APP_REPO_URL=

# (Optional) Documentation URL for help link
# Default: ""
NEXT_PUBLIC_APP_DOCS_URL=
