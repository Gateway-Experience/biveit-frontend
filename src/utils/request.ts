import _ from 'lodash';
import axios, { type AxiosRequestConfig } from 'axios';

// Errors are normalised to this shape so callers can switch on `code`.
export type RequestError = {
  code: number;
  data?: unknown;
};

type RequestOptions = AxiosRequestConfig | string;

// This is used to request backend. Heavily used.
async function callBe(axiosOptions: RequestOptions) {
  let axiosRequest: AxiosRequestConfig;
  if (typeof axiosOptions === 'string') {
    axiosRequest = { url: axiosOptions, method: 'GET' };
  } else {
    axiosRequest = { ...axiosOptions, method: axiosOptions.method || 'GET' };
  }

  axiosRequest.baseURL = import.meta.env.VITE_API_BASE_URL;
  // The session lives only in an httpOnly `access_token` cookie on the API host (JS never sees the
  // token). The FE and API are different origins, so without this the browser drops the Set-Cookie
  // and never sends it back.
  axiosRequest.withCredentials = true;

  return request(axiosRequest);
}

// For more generic requests.
async function request(options: RequestOptions = {}) {
  if (typeof options === 'string') {
    options = { url: options };
  }
  try {
    const result = await axios({
      ...options,
      method: options.method || 'GET',
    });
    return result.data;
  } catch (error) {
    throw getRequestError(error);
  }
}

function getRequestError(error: unknown): RequestError | unknown {
  const status = _.get(error, 'response.status');
  if (status) {
    return { code: status, data: _.get(error, 'response.data') };
  }
  return error;
}

export {
  callBe,
  request,
};
