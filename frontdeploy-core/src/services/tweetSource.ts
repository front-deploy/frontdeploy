export interface TweetEvent {
  id: string;
  authorHandle: string;
  authorId: string;
  text: string;
  url: string;
  type: 'tweet' | 'reply';
  ts: string;
}

export interface TweetSource {
  /**
   * Fetches the latest tweets/replies from a list of accounts
   * @param accounts List of X/Twitter handles (e.g. ['zachxbt', 'blknoiz06'])
   * @param sinceId The ID of the last fetched tweet, to prevent duplicate fetching
   * @returns Array of TweetEvent (sorted from oldest to newest for chronological replay)
   */
  pollSince(accounts: string[], sinceId?: string): Promise<TweetEvent[]>;
}
