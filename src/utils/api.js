const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = localStorage.getItem('token');
    this.authToken = localStorage.getItem('accessToken');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  // Set auth token from Cognito
  setAuthToken(token) {
    this.authToken = token;
    if (token) {
      localStorage.setItem('accessToken', token);
    } else {
      localStorage.removeItem('accessToken');
    }
  }

  getToken() {
    // Prefer Cognito access token, fallback to legacy JWT token
    return this.authToken || this.token || localStorage.getItem('accessToken') || localStorage.getItem('token');
  }

  async getCognitoToken() {
    try {
      const { fetchAuthSession } = await import('aws-amplify/auth');
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString();
      const accessToken = session.tokens?.accessToken?.toString();
      return idToken || accessToken;
    } catch (error) {
      console.warn('Failed to get Cognito token:', error);
      return this.getToken();
    }
  }

  getHeaders(isFormData = false) {
    const headers = {};

    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  async request(method, endpoint, data = null) {
    const url = `${this.baseURL}${endpoint}`;
    const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
    const options = {
      method,
      headers: this.getHeaders(isFormData),
    };

    // Try to get Cognito token and add to headers if available
    try {
      const cognitoToken = await this.getCognitoToken();
      if (cognitoToken) {
        options.headers['Authorization'] = `Bearer ${cognitoToken}`;
      }
    } catch (error) {
      // If Cognito token fetch fails, continue with legacy token from getHeaders()
      console.debug('Using fallback token authentication:', error.message);
    }

    if (data) {
      options.body = isFormData ? data : JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      if (response.status === 204) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error: ${method} ${endpoint}`, error);
      throw error;
    }
  }

  get(endpoint) {
    return this.request('GET', endpoint);
  }

  post(endpoint, data) {
    return this.request('POST', endpoint, data);
  }

  put(endpoint, data) {
    return this.request('PUT', endpoint, data);
  }

  delete(endpoint) {
    return this.request('DELETE', endpoint);
  }
}

export default new ApiClient();
