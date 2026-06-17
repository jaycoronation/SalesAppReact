import { TextStyle } from "react-native";
import { Colors } from "./colors";
import { Fonts } from "./fonts";

export const getRegularTextStyle = ({
  color = Colors.black,
  fontSize = 14,
  textAlign = "left",
}: {
  color?: string;
  fontSize?: number;
  textAlign?: "left" | "center" | "right";
}): TextStyle => {
  return {
    color,
    fontSize,
    fontFamily: Fonts.regular,
    textAlign,
  };
};

export const getMediumTextStyle = ({
  color = Colors.black,
  fontSize = 14,
  textAlign = "left",
}: {
  color?: string;
  fontSize?: number;
  textAlign?: "left" | "center" | "right";
}): TextStyle => {
  return {
    color,
    fontSize,
    fontFamily: Fonts.medium,
    textAlign,
  };
};

export const getBoldTextStyle = ({
  color = Colors.black,
  fontSize = 14,
  textAlign = "left",
}: {
  color?: string;
  fontSize?: number;
  textAlign?: "left" | "center" | "right";
}): TextStyle => {
  return {
    color,
    fontSize,
    fontFamily: Fonts.bold,
    textAlign,
  };
};

export const getSemiBoldTextStyle = ({
  color = Colors.black,
  fontSize = 14,
  textAlign = "left",
}: {
  color?: string;
  fontSize?: number;
  textAlign?: "left" | "center" | "right";
}): TextStyle => {
  return {
    color,
    fontSize,
    fontFamily: Fonts.semiBold,
    textAlign,
  };
};

export const getThinTextStyle = ({
  color = Colors.black,
  fontSize = 14,
  textAlign = "left",
}: {
  color?: string;
  fontSize?: number;
  textAlign?: "left" | "center" | "right";
}): TextStyle => {
  return {
    color,
    fontSize,
    fontFamily: Fonts.black,
    textAlign,
  };
};

export const getBlackTextStyle = ({
  color = Colors.black,
  fontSize = 14,
  textAlign = "left",
}: {
  color?: string;
  fontSize?: number;
  textAlign?: "left" | "center" | "right";
}): TextStyle => {
  return {
    color,
    fontSize,
    fontFamily: Fonts.black,
    textAlign,
  };
};
