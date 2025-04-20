
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

async function getSpotifyAlbumDetails(albumId: string, accessToken: string): Promise<{ title: string; artist: string; coverUrl: string; spotifyUrl: string }> {
  const response = await fetch(`https://api.spotify.com/v1/albums/${albumId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch album details from Spotify');
  }

  const data = await response.json();
  return {
    title: data.name,
    artist: data.artists[0].name,
    coverUrl: data.images[0].url,
    spotifyUrl: data.external_urls.spotify
  };
}

async function getSpotifyTrackDetails(trackId: string, accessToken: string): Promise<{ title: string; artist: string; coverUrl: string; spotifyUrl: string }> {
  const response = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch track details from Spotify');
  }

  const data = await response.json();
  return {
    title: data.name,
    artist: data.artists[0].name,
    coverUrl: data.album.images[0].url,
    spotifyUrl: data.external_urls.spotify
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { spotifyUrl, upc, platforms } = await req.json();
    
    console.log('Processing request:', { spotifyUrl, upc, platforms });
    
    const accessToken = await getSpotifyAccessToken();
    let spotifyId: string | null = null;
    let spotifyType: 'album' | 'track' = 'album';
    let spotifyDetails;
    let finalSpotifyUrl = spotifyUrl;

    if (upc) {
      // Handle UPC code lookup
      spotifyId = await getSpotifyIdFromUPC(upc, accessToken);
      if (!spotifyId) {
        throw new Error('Релиз не найден по UPC коду');
      }
      
      spotifyType = 'album';
      spotifyDetails = await getSpotifyAlbumDetails(spotifyId, accessToken);
      finalSpotifyUrl = spotifyDetails.spotifyUrl;
      
      console.log('Found Spotify album by UPC:', { spotifyId, url: finalSpotifyUrl });
    } else if (spotifyUrl) {
      // Handle direct Spotify URL
      spotifyId = extractSpotifyId(spotifyUrl);
      
      if (!spotifyId) {
        throw new Error('Invalid Spotify URL format or missing ID');
      }
      
      if (spotifyUrl.includes('/track/')) {
        spotifyType = 'track';
        spotifyDetails = await getSpotifyTrackDetails(spotifyId, accessToken);
      } else if (spotifyUrl.includes('/album/')) {
        spotifyType = 'album';
        spotifyDetails = await getSpotifyAlbumDetails(spotifyId, accessToken);
      } else {
        throw new Error('URL must be for a Spotify track or album');
      }
    } else {
      throw new Error('Invalid or missing spotifyUrl or UPC');
    }
    
    if (!spotifyDetails) {
      throw new Error('Failed to fetch details from Spotify');
    }
    
    console.log('Spotify details fetched successfully:', spotifyDetails);
    
    const slug = slugify(spotifyDetails.title);
    
    // Initialize links object with Spotify
    const linksByPlatform = {
      spotify: {
        url: finalSpotifyUrl
      }
    };
    
    // Try to fetch data from Odesli API for other platforms
    try {
      const encodedUrl = encodeURIComponent(finalSpotifyUrl);
      const response = await fetch(`https://api.song.link/v1-alpha.1/links?url=${encodedUrl}`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Add other platforms' links based on user selection
        Object.entries(data.linksByPlatform).forEach(([platform, linkData]: [string, any]) => {
          // Always include Spotify, Apple Music, and YouTube Music
          if (platform === 'spotify' || 
              platform === 'appleMusic' || 
              platform === 'youtubeMusic' ||
              (platform === 'yandex' && platforms.yandex) ||
              (platform === 'soundcloud' && platforms.soundcloud)) {
            linksByPlatform[platform] = {
              url: linkData.url
            };
          }
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
        spotify_url: finalSpotifyUrl,
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
