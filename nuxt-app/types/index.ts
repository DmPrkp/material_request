// import {NavBarItemInterface, NavBarInterface} from "~/types/bars";

interface NavBarItemInterface {
    link: string,
    description: string,
}

interface NavBarInterface  extends Array<NavBarItemInterface>{}

export {
    NavBarItemInterface,
    NavBarInterface
}