export type WeatherRegion = {
    name: string;
    lat: number;
    lng: number;
    group: string;
};

export const WEATHER_REGIONS: WeatherRegion[] = [
    { name: "서울", lat: 37.5665, lng: 126.978, group: "수도권" },
    { name: "인천", lat: 37.4563, lng: 126.7052, group: "수도권" },
    { name: "수원", lat: 37.2636, lng: 127.0286, group: "수도권" },
    { name: "대구", lat: 35.8714, lng: 128.6014, group: "경북·대구" },
    { name: "포항", lat: 36.019, lng: 129.3435, group: "경북·대구" },
    { name: "구미", lat: 36.1195, lng: 128.3445, group: "경북·대구" },
    { name: "경주", lat: 35.8562, lng: 129.2247, group: "경북·대구" },
    { name: "안동", lat: 36.5684, lng: 128.7294, group: "경북·대구" },
    { name: "의성", lat: 36.3527, lng: 128.6973, group: "경북·대구" },
    { name: "상주", lat: 36.4109, lng: 128.159, group: "경북·대구" },
    { name: "김천", lat: 36.1398, lng: 128.1136, group: "경북·대구" },
    { name: "영주", lat: 36.8057, lng: 128.624, group: "경북·대구" },
    { name: "영천", lat: 35.9733, lng: 128.9386, group: "경북·대구" },
    { name: "부산", lat: 35.1796, lng: 129.0756, group: "경남·부산" },
    { name: "울산", lat: 35.5384, lng: 129.3114, group: "경남·부산" },
    { name: "창원", lat: 35.228, lng: 128.6811, group: "경남·부산" },
    { name: "광주", lat: 35.1595, lng: 126.8526, group: "호남" },
    { name: "전주", lat: 35.8242, lng: 127.148, group: "호남" },
    { name: "목포", lat: 34.8118, lng: 126.3922, group: "호남" },
    { name: "대전", lat: 36.3504, lng: 127.3845, group: "충청" },
    { name: "청주", lat: 36.6424, lng: 127.489, group: "충청" },
    { name: "춘천", lat: 37.8813, lng: 127.7298, group: "강원" },
    { name: "원주", lat: 37.3422, lng: 127.9202, group: "강원" },
    { name: "제주", lat: 33.4996, lng: 126.5312, group: "제주" },
];

export const DEFAULT_REGION = WEATHER_REGIONS.find((r) => r.name === "대구")!;
