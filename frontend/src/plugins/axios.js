import axios from "axios";
//There are django settings
axios.defaults.xsrfCookieName = 'csrftoken'
axios.defaults.xsrfHeaderName = "X-CSRFTOKEN"

const axiosInstance  = axios.create({
    // change server url depending on on vue mode (dev or production)
    baseURL: 'http://127.0.0.1:8000/',
    timeout: 250000,
    withCredentials: false,
    headers: {'Content-Type': 'application/json'}
})

export const $axios = axiosInstance;
