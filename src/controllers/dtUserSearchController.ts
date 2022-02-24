import * as jf from 'joiful';
import { AndFilter, Filter, OrFilter, PresenceFilter, SubstringFilter } from 'ldapjs';

import { ldapClient } from '../integration/ldap';
import { searchAsyncMultiple } from '../util/ldapUtils';
import { logger } from '../util/logging';

/**
 */
export class DtSearch {
  /**
   * Search value.
   */
  @jf.string().allow('').required()
  value: string;

  /**
   * `true` if the filter should be treated as a regular expression for advanced searching,
   * `false` otherwise. Note that normally server-side processing scripts will not perform regular
   * expression searching for performance reasons on large data sets, but it is technically possible
   * and at the discretion of your script.
   */
  @jf.boolean().default(false)
  regex: boolean;
}

/**
 */
export class DtOrder {
  /**
   * Column to which ordering should be applied. This is an index reference to the `columns` array
   * of information that is also submitted to the server.
   */
  @jf.number().integer().min(0).required()
  column: number;

  /**
   * Ordering direction for this column. It will be `asc` or `desc` to indicate ascending ordering
   * or descending ordering, respectively.
   */
  @jf.string().valid('asc', 'desc').required()
  dir: 'asc' | 'desc';
}

/**
 */
export class DtColumn {
  /**
   * Column's data source, as defined by `columns.data` option client-side.
   */
  @jf.string().optional()
  data?: string;

  /**
   * Column's name, as defined by `columns.name` client-side.
   */
  @jf.string().allow('').optional()
  name?: string;

  /**
   * Flag to indicate if this column is searchable (`true`) or not (`false`).
   */
  @jf.boolean().required()
  searchable: boolean;

  /**
   * Flag to indicate if this column is orderable (`true`) or not (`false`).
   */
  @jf.boolean().required()
  orderable: boolean;

  @jf.object().optional()
  search?: DtSearch;
}

/**
 * A request for server-side processing from the client DataTable.
 *
 * See https://datatables.net/manual/server-side
 */
export class DtServerRequest {
  /**
   * Draw counter. This is used by DataTables to ensure that the Ajax returns from server-side
   * processing requests are drawn in sequence by DataTables (Ajax requests are asynchronous and
   * thus can return out of sequence). This is used as part of the `draw` return parameter.
   */
  @jf.number().integer().required()
  draw: number;

  /**
   * Paging first record indicator. This is the start point in the current data set (0 index based -
   * i.e. 0 is the first record).
   */
  @jf.number().integer().min(0).required()
  start: number;

  /**
   * Number of records that the table can display in the current draw. It is expected that the
   * number of records returned will be equal to this number, unless the server has fewer records to
   * return. Note that this can be -1 to indicate that all records should be returned (although
   * that negates any benefits of server-side processing!)
   */
  @jf.number().integer().min(0).required()
  length: number;

  @jf.object().required()
  search: DtSearch;

  @jf.array({ elementClass: DtOrder }).required()
  order: DtOrder[];

  @jf.array({ elementClass: DtColumn }).required()
  columns: DtColumn[];

  /**
   * stupid Ajax caching parameter
   */
  @jf.any().optional()
  '_': any;
}

/**
 *
 */
export interface DtServerResponse {
  /**
   * The draw counter that this object is a response to - from the `draw` parameter sent as part of
   * the data request.
   */
  draw: number;
  /**
   * Total records, before filtering (i.e. the total number of records in the database)
   */
  recordsTotal: number;

  /**
   * Total records, after filtering (i.e. the total number of records after filtering has been
   * applied - not just the number of records being returned for this page of data).
   */
  recordsFiltered: number;

  /**
   * The data to be displayed in the table. This is an array of data source objects, one for each
   * row, which will be used by DataTables.
   */
  data: any[];

  /**
   * If an error occurs during the running of the server-side processing script, you can inform the
   * user of this error by passing back the error message to be displayed using this parameter. Do
   * not include if there is no error.
   */
  error?: string;
}

export const processUserSearch = async (request: DtServerRequest): Promise<DtServerResponse> => {
  // just start this so it can run
  const resultsForCount = searchAsyncMultiple(ldapClient, null, 'uid');

  const attributes = request.columns.flatMap((column) => {
    // weird mapNotNull
    return column.data ? [column.data] : [];
  });

  const attribFilter = new PresenceFilter({ attribute: 'uid' });

  // we construct an AND filter to combine all the possible column filters
  const columnFilters = request.columns.flatMap((column) => {
    const filters: Filter[] = [];
    if (column.searchable) {
      if (column.search && column.search.value !== '') {
        // word-by-word fuzzy matching
        column.search.value.split(' ').forEach((searchTerm) => {
          filters.push(
            new SubstringFilter({ attribute: column.data, initial: '', any: [searchTerm] }),
          );
        });
      }
    }
    return filters;
  });

  // and an OR filter to pick up any entry with a column matching the global search
  const globalFilter =
    request.search && request.search.value !== ''
      ? new OrFilter({
          filters: request.columns.flatMap((column) => {
            const filters: Filter[] = [];
            if (column.searchable) {
              if (request.search) {
                // word-by-word fuzzy matching
                request.search.value.split(' ').forEach((searchTerm) => {
                  filters.push(
                    new SubstringFilter({ attribute: column.data, initial: '', any: [searchTerm] }),
                  );
                });
              }
            }
            return filters;
          }),
        })
      : null;

  let filter: string | Filter;

  if (columnFilters.length > 0 && globalFilter) {
    filter = new AndFilter({ filters: columnFilters.concat(globalFilter, attribFilter) });
  } else if (columnFilters.length > 0) {
    filter = new AndFilter({ filters: columnFilters.concat(attribFilter) });
  } else if (globalFilter) {
    filter = new AndFilter({ filters: [globalFilter, attribFilter] });
  } else {
    filter = attribFilter;
  }

  const results = await searchAsyncMultiple(ldapClient, filter, attributes);

  results.sort((a, b) => {
    for (let i = 0; i < request.order.length; i++) {
      const element = request.order[i];
      const key = request.columns[element.column].data;
      const aVal = a[key];
      const bVal = b[key];

      const result = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;

      if (result !== 0) {
        return element.dir == 'asc' ? result : -result;
      }
    }
  });

  const pagedResults =
    request.length != -1 ? results.slice(request.start, request.start + request.length) : results;

  logger.debug(`Found ${results.length} results, returning ${pagedResults.length}`);

  return {
    draw: request.draw,
    recordsTotal: (await resultsForCount).length,
    recordsFiltered: results.length,
    data: pagedResults,
  };
};
