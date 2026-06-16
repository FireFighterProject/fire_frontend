export type ApiVehicleListItem = {
    id: number;
    stationId: number;
    sido: string;
    typeName: string;
    callSign: string;
    status: number;
    rallyPoint: number;
    capacity?: number | string;
    personnel?: number | string;
    avlNumber?: string;
    psLteNumber?: string;
};

export type ApiFireStation = {
    id: number;
    sido: string;
    name: string;
    address: string;
};

export type ApiStats = {
    totalVehicles?: number;
    totalDispatchCount?: number;
    totalMinutes?: number;
    [key: string]: unknown;
};

export type ApiLogEvent = {
    id: number;
    vehicleId: number;
    orderId: number;
    batchNo: number;
    eventType: string;
    address: string;
    content: string;
    memo: string;
    eventTime: string;
};

export type LatestDispatchResponse = {
    orderId: number;
    address: string;
    content: string;
    message: string;
};

export type FetchVehiclesParams = {
    stationId?: number | "";
    status?: number | "";
    typeName?: string;
    callSignLike?: string;
};

export type MapVehicleOptions = {
    stationName?: string;
    station?: ApiFireStation;
};
