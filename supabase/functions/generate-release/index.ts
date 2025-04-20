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

function extractSpotifyId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    
    if (!urlObj.hostname.includes('spotify.com')) {
      return null;
    }
    
    const pathParts = urlObj.pathname.split('/');
    
    if (pathParts.length >= 3) {
      return pathParts[2].split('?')[0];
    }
    
    return null;
  } catch (error) {
    console.error('Invalid URL format:', error);
    return null;
  }
}

async function getSpotifyAlbumDetails(albumId: string, accessToken: string): Promise<{ title: string; artist: string; coverUrl: string; spotifyUrl: string } | null> {
  try {
    const response = await fetch(`https://api.spotify.com/v1/albums/${albumId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch album details from Spotify');
      return null;
    }

    const data = await response.json();
    return {
      title: data.name,
      artist: data.artists[0].name,
      coverUrl: data.images[0].url,
      spotifyUrl: data.external_urls.spotify
    };
  } catch (error) {
    console.error('Error fetching album details:', error);
    return null;
  }
}

async function getSpotifyTrackDetails(trackId: string, accessToken: string): Promise<{ title: string; artist: string; coverUrl: string; spotifyUrl: string } | null> {
  try {
    const response = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch track details from Spotify');
      return null;
    }

    const data = await response.json();
    return {
      title: data.name,
      artist: data.artists[0].name,
      coverUrl: data.album.images[0].url,
      spotifyUrl: data.external_urls.spotify
    };
  } catch (error) {
    console.error('Error fetching track details:', error);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { spotifyUrl, upc, platforms } = await req.json();
    
    console.log('Processing request:', { spotifyUrl, upc, platforms });
    
    let title = "Неизвестный релиз";
    let artist = "Неизвестный артист";
    let coverUrl = "https://pjkqcvuqzceepanbzpyx.supabase.co/storage/v1/object/public/releases/placeholder.jpg";
    let finalSpotifyUrl = spotifyUrl || "";
    let spotifyDetails = null;

    if (spotifyUrl || upc) {
      const accessToken = await getSpotifyAccessToken();
      let spotifyId: string | null = null;

      if (upc) {
        spotifyId = await getSpotifyIdFromUPC(upc, accessToken);
        if (spotifyId) {
          spotifyDetails = await getSpotifyAlbumDetails(spotifyId, accessToken);
        }
      } else if (spotifyUrl) {
        spotifyId = extractSpotifyId(spotifyUrl);
        if (spotifyId) {
          if (spotifyUrl.includes('/track/')) {
            spotifyDetails = await getSpotifyTrackDetails(spotifyId, accessToken);
          } else if (spotifyUrl.includes('/album/')) {
            spotifyDetails = await getSpotifyAlbumDetails(spotifyId, accessToken);
          }
        }
      }

      if (spotifyDetails) {
        title = spotifyDetails.title;
        artist = spotifyDetails.artist;
        coverUrl = spotifyDetails.coverUrl;
        finalSpotifyUrl = spotifyDetails.spotifyUrl;
      }
    }
    
    const slug = title !== "Неизвестный релиз" 
      ? slugify(title)
      : `release-${Date.now()}`;
    
    const linksByPlatform: Record<string, { url: string }> = {};
    if (finalSpotifyUrl) {
      linksByPlatform.spotify = { url: finalSpotifyUrl };
    }
    
    if (finalSpotifyUrl) {
      try {
        const encodedUrl = encodeURIComponent(finalSpotifyUrl);
        const response = await fetch(`https://api.song.link/v1-alpha.1/links?url=${encodedUrl}`);
        
        if (response.ok) {
          const data = await response.json();
          
          Object.entries(data.linksByPlatform).forEach(([platform, linkData]: [string, any]) => {
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
        }
      } catch (error) {
        console.error('Failed to fetch from Odesli:', error);
      }
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error: dbError } = await supabase
      .from('releases')
      .insert({
        slug,
        title,
        artist,
        cover_url: coverUrl,
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
