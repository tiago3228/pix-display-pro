export type ServerQueryResult<T> = {
  data: T | null;
  error: unknown;
};

export interface ServerQueryBuilder<T> extends PromiseLike<ServerQueryResult<T>> {
  select(columns: string): ServerQueryBuilder<T>;
  eq(column: string, value: unknown): ServerQueryBuilder<T>;
  in(column: string, values: readonly unknown[]): ServerQueryBuilder<T>;
  order(column: string, options?: { ascending?: boolean }): ServerQueryBuilder<T>;
  maybeSingle(): Promise<ServerQueryResult<T>>;
}

export type ServerSupabaseAdmin = {
  from<T>(table: string): ServerQueryBuilder<T>;
  rpc<T = unknown>(
    functionName: string,
    args: Record<string, unknown>,
  ): Promise<ServerQueryResult<T>>;
  storage: {
    from(bucket: string): {
      createSignedUrl(
        path: string,
        expiresIn: number,
      ): Promise<{
        data: { signedUrl?: string } | null;
        error: unknown;
      }>;
    };
  };
};
