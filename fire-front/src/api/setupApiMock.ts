import axios from "axios";
import { installApiMock, isMockApiEnabled, mockAxiosAdapter } from "./mockApi";

if (isMockApiEnabled()) {
    axios.defaults.adapter = mockAxiosAdapter;
    installApiMock();
}
