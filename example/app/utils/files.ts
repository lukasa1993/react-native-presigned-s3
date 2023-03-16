import {check_response, endpoint, header} from './api';

export const create = async (payload: any) => {
  const res = await fetch(`${await endpoint()}/create`, {
    headers: await header(),
    method: 'post',
    body: JSON.stringify(payload),
  });

  return check_response(res);
};

export const get = async (key: string) => {
  const res = await fetch(`${await endpoint()}/${key}`, {
    headers: await header(),
  });

  return check_response(res);
};

export const remove = async (key: string) => {
  const res = await fetch(`${await endpoint()}/${key}`, {
    method: 'DELETE',
    headers: await header(),
  });

  return check_response(res);
};

export const list = async (prefix: string) => {
  const res = await fetch(`${await endpoint()}/files/${prefix}`, {
    headers: await header(),
  });

  return check_response(res);
};
