import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import { slugify } from 'https://deno.land/x/slugify@0.3.0/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SPOTIFY_CLIENT_ID = Deno.env.get('SPOTIFY_CLIENT_ID');
const SPOTIFY_CLIENT_SECRET = Deno.env.get('SPOTIFY_CLIENT_SECRET');

async function getSpotifyAccessToken(): Promise<string> {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)}`,
    },
    body: 'grant_type=client_credentials',
  });

  const data = await response.json();
  return data.access_token;
}

async function getSpotifyIdFromUPC(upc: string, accessToken: string): Promise<string | null> {
  try {
    const response = await fetch(`https://api.spotify.com/v1/search?q=upc:${upc}&type=album`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to search Spotify by UPC');
    }

    const data = await response.json();
    if (data.albums.items.length > 0) {
      return data.albums.items[0].id;
    }

    return null;
  } catch (error) {
    console.error('Error searching by UPC:', error);
    return null;
  }
}

// Extract Spotify ID from various URL formats
function extractSpotifyId(url: string): string | null {
  try {
    // Handle different Spotify URL formats
    const urlObj = new URL(url);
    
    if (!urlObj.hostname.includes('spotify.com')) {
      return null;
    }
    
    // Extract the ID from different URL patterns
    const pathParts = urlObj.pathname.split('/');
    
    // Format: spotify.com/track/ID or spotify.com/album/ID
    if (pathParts.length >= 3) {
      return pathParts[2].split('?')[0];
    }
    
    return null;
  } catch (error) {
    console.error('Invalid URL format:', error);
    return null;
  }
}

async function getSpotifyTrackDetails(spotifyUrl: string): Promise<{ title: string; artist: string; coverUrl: string }> {
  const trackId = extractSpotifyId(spotifyUrl);
  
  if (!trackId) {
    throw new Error('Invalid Spotify URL format or missing ID');
  }
  
  console.log('Extracted Spotify ID:', trackId);

  const accessToken = await getSpotifyAccessToken();
  
  // Try to fetch as a track first
  try {
    const response = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      return {
        title: data.name,
        artist: data.artists[0].name,
        coverUrl: data.album.images[0].url,
      };
    }
  } catch (error) {
    console.error('Error fetching track:', error);
  }
  
  // If track fetch fails, try as an album
  try {
    const response = await fetch(`https://api.spotify.com/v1/albums/${trackId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      return {
        title: data.name,
        artist: data.artists[0].name,
        coverUrl: data.images[0].url,
      };
    }
  } catch (error) {
    console.error('Error fetching album:', error);
  }
  
  throw new Error('Failed to fetch details from Spotify - resource not found');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { spotifyUrl, upc } = await req.json();
    
    if (!spotifyUrl && !upc) {
      throw new Error('Invalid or missing spotifyUrl or UPC');
    }
    
    console.log('Processing request:', { spotifyUrl, upc });
    
    const accessToken = await getSpotifyAccessToken();
    let spotifyId: string | null = null;

    if (upc) {
      spotifyId = await getSpotifyIdFromUPC(upc, accessToken);
      if (!spotifyId) {
        throw new Error('Релиз не найден по UPC коду');
      }
    } else {
      spotifyId = extractSpotifyId(spotifyUrl);
    }

    if (!spotifyId) {
      throw new Error('Invalid Spotify URL format or missing ID');
    }
    
    console.log('Spotify ID:', spotifyId);

    const spotifyDetails = await getSpotifyTrackDetails(spotifyUrl);
    console.log('Spotify details fetched successfully:', spotifyDetails);
    
    // Create a slug from the title
    const slug = slugify(spotifyDetails.title);
    
    // Initialize links object with Spotify
    const linksByPlatform = {
      spotify: {
        url: spotifyUrl
      }
    };
    
    // Try to fetch data from Odesli API for other platforms
    try {
      const encodedUrl = encodeURIComponent(spotifyUrl);
      const response = await fetch(`https://api.song.link/v1-alpha.1/links?url=${encodedUrl}`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Add other platforms' links
        Object.entries(data.linksByPlatform).forEach(([platform, linkData]: [string, any]) => {
          linksByPlatform[platform] = {
            url: linkData.url
          };
        });
        
        console.log('Odesli data fetched successfully');
      } else {
        console.log('Odesli API returned an error, using Spotify link only');
      }
    } catch (error) {
      console.error('Failed to fetch from Odesli:', error);
      // Continue with just the Spotify link
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error: dbError } = await supabase
      .from('releases')
      .insert({
        slug,
        title: spotifyDetails.title,
        artist: spotifyDetails.artist,
        cover_url: spotifyDetails.coverUrl,
        spotify_url: spotifyUrl,
        links_by_platform: linksByPlatform
      });

    if (dbError) throw dbError;

    return new Response(
      JSON.stringify({ slug }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
