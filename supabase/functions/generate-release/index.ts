
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

async function getSpotifyTrackDetails(spotifyUrl: string): Promise<{ title: string; artist: string; coverUrl: string }> {
  const trackId = spotifyUrl.split('/').pop()?.split('?')[0];
  if (!trackId) throw new Error('Invalid Spotify URL');

  const accessToken = await getSpotifyAccessToken();
  const response = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();
  if (!response.ok) {
    console.error('Spotify API error:', data);
    throw new Error('Failed to fetch track details from Spotify');
  }

  return {
    title: data.name,
    artist: data.artists[0].name,
    coverUrl: data.album.images[0].url,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { spotifyUrl } = await req.json();
    const encodedUrl = encodeURIComponent(spotifyUrl);
    
    // Fetch Spotify track details first
    const spotifyDetails = await getSpotifyTrackDetails(spotifyUrl);
    
    // Fetch data from Odesli API
    const response = await fetch(`https://api.song.link/v1-alpha.1/links?url=${encodedUrl}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error('Failed to fetch from Odesli');
    }

    const linksByPlatform = {};
    Object.entries(data.linksByPlatform).forEach(([platform, linkData]) => {
      linksByPlatform[platform] = {
        url: linkData.url
      };
    });

    const slug = slugify(spotifyDetails.title);

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
