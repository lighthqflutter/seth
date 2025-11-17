/**
 * Vercel Domain Management
 * Automatically adds school subdomains to Vercel when schools register
 */

interface VercelDomainResponse {
  name: string;
  apexName: string;
  projectId: string;
  verified: boolean;
  verification?: Array<{
    type: string;
    domain: string;
    value: string;
    reason: string;
  }>;
}

/**
 * Add a subdomain to Vercel project
 * @param subdomain - The school subdomain (e.g., "divinegrace")
 * @returns Promise with domain addition result
 */
export async function addDomainToVercel(subdomain: string): Promise<{
  success: boolean;
  domain?: string;
  error?: string;
}> {
  try {
    const token = process.env.VERCEL_TOKEN;
    const projectId = process.env.VERCEL_PROJECT_ID;
    const teamId = process.env.VERCEL_TEAM_ID;

    if (!token || !projectId) {
      console.error('Vercel configuration missing. Skipping domain addition.');
      return {
        success: false,
        error: 'Vercel API credentials not configured',
      };
    }

    const domain = `${subdomain}.seth.ng`;

    // Check if domain already exists
    const checkUrl = teamId
      ? `https://api.vercel.com/v9/projects/${projectId}/domains/${domain}?teamId=${teamId}`
      : `https://api.vercel.com/v9/projects/${projectId}/domains/${domain}`;

    const checkResponse = await fetch(checkUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (checkResponse.ok) {
      console.log(`Domain ${domain} already exists in Vercel`);
      return {
        success: true,
        domain,
      };
    }

    // Add domain to Vercel project
    const addUrl = teamId
      ? `https://api.vercel.com/v10/projects/${projectId}/domains?teamId=${teamId}`
      : `https://api.vercel.com/v10/projects/${projectId}/domains`;

    const response = await fetch(addUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: domain,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Failed to add domain to Vercel:', errorData);
      return {
        success: false,
        error: errorData.error?.message || 'Failed to add domain',
      };
    }

    const data: VercelDomainResponse = await response.json();

    console.log(`Successfully added domain ${domain} to Vercel`);

    return {
      success: true,
      domain,
    };
  } catch (error: any) {
    console.error('Error adding domain to Vercel:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Remove a subdomain from Vercel project
 * @param subdomain - The school subdomain (e.g., "divinegrace")
 * @returns Promise with domain removal result
 */
export async function removeDomainFromVercel(subdomain: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const token = process.env.VERCEL_TOKEN;
    const projectId = process.env.VERCEL_PROJECT_ID;
    const teamId = process.env.VERCEL_TEAM_ID;

    if (!token || !projectId) {
      console.error('Vercel configuration missing. Skipping domain removal.');
      return {
        success: false,
        error: 'Vercel API credentials not configured',
      };
    }

    const domain = `${subdomain}.seth.ng`;

    const deleteUrl = teamId
      ? `https://api.vercel.com/v9/projects/${projectId}/domains/${domain}?teamId=${teamId}`
      : `https://api.vercel.com/v9/projects/${projectId}/domains/${domain}`;

    const response = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Failed to remove domain from Vercel:', errorData);
      return {
        success: false,
        error: errorData.error?.message || 'Failed to remove domain',
      };
    }

    console.log(`Successfully removed domain ${domain} from Vercel`);

    return {
      success: true,
    };
  } catch (error: any) {
    console.error('Error removing domain from Vercel:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}
