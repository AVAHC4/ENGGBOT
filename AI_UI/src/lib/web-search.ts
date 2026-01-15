 

export interface SearchResult {
  title: string;
  snippet: string;
  url: string;
}

 
const SEARCH_API_URL = process.env.NEXT_PUBLIC_SEARCH_API_URL || 'https://api.search.example.com';
const SEARCH_API_KEY = process.env.NEXT_PUBLIC_SEARCH_API_KEY;

 
export async function performWebSearch(query: string): Promise<SearchResult[]> {
  try {
     
     
    return getMockSearchResults(query);

     
     
  } catch (error) {
    console.error('Web search failed:', error);
     
    return [];
  }
}

 
function getMockSearchResults(query: string): SearchResult[] {
  const currentDate = new Date().toLocaleDateString();

   
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