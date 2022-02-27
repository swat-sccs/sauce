import { getReasonPhrase } from 'http-status-codes';

import { logger } from '../util/logging';

interface HttpExceptionOptions {
  /**
   * A title for the error page. Defaults to the status code and corresponding HTTP reason phrase
   * (like '500 Internal Server Error').
   */
  title?: string;
  /**
   * An error description for logging. The 404 page template also assumes that this is a path
   * specification of what you were looking for.
   */
  message?: string;
  /**
   * A friendly message. May be rendered on the error page, depending on the error type (see
   * `/views/error.pug`). Defaults to the value of `message` or to the empty string.
   */
  friendlyMessage?: string;
  /**
   * Whether to show the navbar in the rendered error page. Defaults to `false`.
   */
  showNavbar?: boolean;
  /**
   * Whether to show the footer in the rendered error page. Defaults to `true`.
   */
  showFooter?: boolean;
}

/**
 * Exception resulting in a specific HTTP status code.
 */
export class HttpException extends Error {
  status: number;
  title: string;
  // workaround because the 'message' field from Error doesn't show up in Pug templates for some reason
  msg: string;
  friendlyMessage: string;
  showNavbar: boolean;
  showFooter: boolean;

  /**
   * Create a new `HttpException`.
   * @param {number} status The status code to be returned
   * @param {HttpExceptionOptions} options Options for the message display
   */
  constructor(status: number, options: HttpExceptionOptions = {}) {
    super(options.message ?? '');
    this.status = status;
    this.friendlyMessage = options.friendlyMessage ?? options.message ?? '';
    this.msg = options.message ?? '';
    try {
      this.title = options.title ?? `${status} ${getReasonPhrase(status)}`;
    } catch (err) {
      logger.error(`Couldn't get reason phrase for error code ${status}`);
      this.title = `Error ${status}`;
    }
    this.showNavbar = options.showNavbar ?? false;
    this.showFooter = options.showFooter ?? true;
  }
}
