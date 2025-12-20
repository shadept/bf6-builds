"use client";

import dynamic from "next/dynamic";
import { type ComponentProps } from "react";
import { WeaponList as WeaponListComponent } from "./index";

const WeaponList = dynamic(
    () => import("./index").then((mod) => mod.WeaponList),
    { ssr: false }
);

export function ClientWeaponList(props: ComponentProps<typeof WeaponListComponent>) {
    return <WeaponList {...props} />;
}
