export class Result<T, E = Error> {
  private constructor(
    private readonly value: T | null,
    private readonly error: E | null,
  ) {}

  static err<T, E>(error: E): Result<T, E> {
    return new Result<T, E>(null, error);
  }

  static ok<T, E>(value: T): Result<T, E> {
    return new Result<T, E>(value, null);
  }

  map<U>(fn: (value: T) => U): Result<U, E> {
    return this.error ? Result.err(this.error) : Result.ok(fn(this.value!));
  }

  andThen<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    return this.error ? Result.err(this.error) : fn(this.value!);
  }

  async andThenAsync<U>(
    fn: (value: T) => Promise<Result<U, E>>,
  ): Promise<Result<U, E>> {
    if (this.error) return Result.err(this.error);
    return await fn(this.value!);
  }

  match<U>(ok: (value: T) => U, err: (error: E) => U): U {
    return this.error ? err(this.error) : ok(this.value!);
  }

  async matchAsync<U>(
    ok: (value: T) => Promise<U>,
    err: (error: E) => Promise<U>,
  ): Promise<U> {
    return this.error ? await err(this.error) : await ok(this.value!);
  }
}
