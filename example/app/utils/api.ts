export async function endpoint() {
  return 'http://localhost:3000';
}

export async function check_response(response: any) {
  if (response.ok) {
    try {
      const text = await response.text();

      try {
        return JSON.parse(text);
      } catch (e) {
        return text;
      }
    } catch (e) {
      console.log('check_response', e);
      return response;
    }
  } else {
    throw new Error(response.statusText || response.status);
  }
}

export async function header() {
  return {
    'Content-Type': 'application/json',
  };
}
