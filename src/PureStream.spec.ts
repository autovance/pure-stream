import { PureStream } from './PureStream';
import { PassThrough } from 'stream';

describe('PureStream', () => {
  describe('pipe', () => {
    it('pipes errors from source', (done) => {
      const source = new PureStream();
      const dest = new PureStream();

      source.pipe(dest).done((err) => {
        expect(source.ended).toBe(true);
        expect(dest.ended).toBe(true);
        expect(err).toEqual(new Error('test'));
        done();
      });

      source.write(1);
      source.destroy(new Error('test'));
    });

    it('pipes errors from dest', (done) => {
      const source = new PureStream();
      const dest = new PureStream();

      source.pipe(dest).done((err) => {
        expect(source.ended).toBe(false);
        expect(dest.ended).toBe(true);
        expect(err).toEqual(new Error('test'));
        done();
      });

      source.write(1);
      dest.destroy(new Error('test'));
    });

    it('propogates errors to multiple pipes', (done) => {
      const source = new PureStream();
      const dest1 = new PureStream();
      const dest2 = new PureStream();
      const dest3 = new PureStream();

      source
        .pipe(dest1)
        .pipe(dest2)
        .done((err) => {
          expect(err).toEqual(new Error('test'));
        });
      source.pipe(dest3).done((err) => {
        expect(err).toEqual(new Error('test'));
      });

      source.done((err) => {
        expect(err).toEqual(new Error('test'));
        setImmediate(() => {
          expect.assertions(3);
          done();
        });
      });

      source.destroy(new Error('test'));
    });
  });

  describe('wrap', () => {
    it('wraps node stream', (done) => {
      const source = new PassThrough({ objectMode: true });
      const dest = new PureStream();

      PureStream.wrap(source)
        .pipe(dest)
        .done((err) => {
          expect(err).toEqual(new Error('test'));
          done();
        });

      source.write(1);
      source.destroy(new Error('test'));
    });

    it('wraps node stream with multiple errors', (done) => {
      const source = new PassThrough({ objectMode: true });
      const dest = new PureStream();

      PureStream.wrap(source)
        .pipe(dest)
        .done((err) => {
          expect(err).toEqual(new Error('test1'));
          done();
        });

      source.write(1);
      source.emit('error', new Error('test1'));
      source.destroy(new Error('test2'));
    });
  });

  describe('done', () => {
    it('resumes stream', (done) => {
      expect.assertions(3);

      const check = jest.fn();
      const stream = new PureStream();
      stream.each(check);
      stream.write(1);

      // Handle end, and begin consuming
      stream.done((err) => expect(err).toBe(undefined));

      // `each` has occured
      setImmediate(() => expect(check.mock.calls.length).toBe(1));
      setImmediate(() =>
        stream.done(() => {
          expect(check.mock.calls.length).toBe(2);
          done();
        })
      );
      setImmediate(() => stream.end(2));
    });

    it('does not resume stream', (done) => {
      expect.assertions(3);

      const check = jest.fn();
      const stream = new PureStream();
      stream.each(check);
      stream.write(1);

      // Handle end, but don't consume
      stream.done((err) => expect(err).toBe(undefined), false);

      // `each` has not occured yet
      setImmediate(() => expect(check.mock.calls.length).toBe(0));
      setImmediate(() =>
        stream.done(() => {
          expect(check.mock.calls.length).toBe(2);
          done();
        })
      );
      setImmediate(() => stream.end(2));
    });
  });

  describe('toNodeStream', () => {
    it('resolves to node stream successfully', (done) => {
      const checkData = jest.fn();
      const checkError = jest.fn();

      const stream = new PureStream<number>();
      stream
        .toNodeStream()
        .on('data', checkData)
        .on('error', checkError)
        .once('end', () => {
          expect(checkData.mock.calls.length).toBe(3);
          expect(checkError.mock.calls.length).toBe(0);
          done();
        });

      stream.write(1);
      stream.write(2);
      stream.end(3);
    });

    it('resolves to node stream with error', (done) => {
      const checkData = jest.fn();
      const checkError = jest.fn();

      const stream = new PureStream<number>();
      stream
        .toNodeStream()
        .on('data', checkData)
        .on('error', checkError)
        .once('end', () => {
          expect(checkData.mock.calls.length).toBe(2);
          expect(checkError.mock.calls.length).toBe(1);
          done();
        });

      stream.write(1);
      stream.write(2);
      stream.destroy(new Error('test'));
    });
  });

  describe('toPromise', () => {
    it('resolves stream to promise for an array', async () => {
      const stream = new PureStream();
      stream.write(1);
      stream.write(2);
      stream.end(3);
      const result = await stream.toPromise();
      expect(result).toEqual([1, 2, 3]);
    });
  });
});
