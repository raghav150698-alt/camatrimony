import {defineCloudflareConfig} from '@opennextjs/cloudflare';
import staticAssetsCache from '@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache';
// Pages are prerendered at build time; member data is fetched from the authenticated API in the browser.
export default defineCloudflareConfig({incrementalCache:staticAssetsCache});
