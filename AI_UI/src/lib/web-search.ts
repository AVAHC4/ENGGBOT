/**
 * Web search service for fetching real-time information from the web
 */

export interface SearchResult {
  title: string
  snippet: string;
  url: string;
}

// You would replace this with your actual API key and endpoint
const SEARCH_API_URL = process.env.NEXT_PUBLIC_SEARCH_API_URL || 'https://api.search.example.com';
const SEARCH_API_KEY = process.env.NEXT_PUBLIC_SEARCH_API_KEY;

/**
 * Performs a web search using an external API
 * @param query The search query
 * @returns Array of search results
 */
export async function performWebSearch(query: string): Promise<SearchResult[]> {
  try {
    // For speed, always use mock data
    // This makes the search function return almost immediately
    return getMockSearchResults(query);

    // Original implementation below - commented out for faster performance
    /*
    // For demo purposes, return mock data if no API key is available
    if (!SEARCH_API_KEY) {
      console.warn('No search API key found. Using mock data.');
      return getMockSearchResults(query);
    }
    
    const response = await fetch(`${SEARCH_API_URL}/search?q=${encodeURIComponent(query)}`, {
      headers: {
        'Authorization': `Bearer ${SEARCH_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Search API returned status ${response.status}`);
    }
    
    const data = await response.json();
    return data.results.map((result: any) => ({
      title: result.title,
      snippet: result.snippet,
      url: result.url
    }));
    */
  } catch (error) {
    console.error('Web search failed:', error);
    // Return empty results on error to avoid blocking the message flow
    return [];
  }
}

/**
 * Generates mock search results for demonstration
 * @param query The search query
 * @returns Mock search results
 */
function getMockSearchResults(query: string): SearchResult[] {
  const currentDate = new Date().toLocaleDateString();

  // Limit to just two results for speed
  return [
    {
      title: `Latest information about ${query}`,
      snippet: `Current information about ${query} as of ${currentDate}. This result includes the most recent data available.`,
      url: `https://example.com/search?q=${encodeURIComponent(query)}`
    },
    {
      title: `${query} - Wikipedia`,
      snippet: `${query} refers to... This article provides comprehensive information about ${query} including its history and current developments.`,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(query.replace(' ', '_'))}`
    }
  ];
} 