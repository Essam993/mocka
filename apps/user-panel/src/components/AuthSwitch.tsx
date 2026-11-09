import { Link } from "react-router";
import { theme } from "antd";

interface Props {
  text: string;
  linkText: string;
  to: string;
}

export default function AuthSwitch({ text, linkText, to }: Props) {
  const { token } = theme.useToken();
  return (
    <>
      {text}{" "}
      <Link to={to} replace className="font-medium hover:underline" style={{ color: token.colorPrimary }}>
        {linkText}
      </Link>
    </>
  );
}