import React from 'react';
import { Image } from 'react-native';
import dashboard from '../../../assets/material-symbols/dashboard.png';
import map from '../../../assets/material-symbols/map.png';
import directions_car from '../../../assets/material-symbols/directions_car.png';
import report from '../../../assets/material-symbols/report.png';
import light_mode from '../../../assets/material-symbols/light_mode.png';
import dark_mode from '../../../assets/material-symbols/dark_mode.png';
import logout from '../../../assets/material-symbols/logout.png';
import rainy from '../../../assets/material-symbols/rainy.png';
import search from '../../../assets/material-symbols/search.png';
import route from '../../../assets/material-symbols/route.png';
import my_location from '../../../assets/material-symbols/my_location.png';
import check_circle from '../../../assets/material-symbols/check_circle.png';
import save from '../../../assets/material-symbols/save.png';

const icons = { dashboard, map, directions_car, report, light_mode, dark_mode, logout, rainy, search, route, my_location, check_circle, save };

export default function MaterialIcon({ name, color, size = 24 }) {
  return <Image source={icons[name]} accessible={false} importantForAccessibility="no"
    style={{ width: size, height: size, tintColor: color }} resizeMode="contain" />;
}
