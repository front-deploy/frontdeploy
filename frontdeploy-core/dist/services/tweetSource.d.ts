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
     * Mengambil tweet/reply terbaru dari daftar akun
     * @param accounts Daftar handle X/Twitter (misal: ['zachxbt', 'blknoiz06'])
     * @param sinceId ID tweet terakhir yang ditarik, agar tidak menarik tweet duplikat
     * @returns Array of TweetEvent (diurutkan dari yang paling lama hingga paling baru untuk event replay)
     */
    pollSince(accounts: string[], sinceId?: string): Promise<TweetEvent[]>;
}
//# sourceMappingURL=tweetSource.d.ts.map