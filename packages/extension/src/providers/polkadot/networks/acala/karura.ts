import { NetworkNames } from "@enkryptcom/types";
import assets from "./assets/karura-assets";
import {
  SubstrateNetwork,
  SubstrateNetworkOptions,
} from "../../types/substrate-network";
import { subscanActivity } from "../../libs/activity-handlers";
import wrapActivityHandler from "@/libs/activity-state/wrap-activity-handler";

const karuraOptions: SubstrateNetworkOptions = {
  name: NetworkNames.Karura,
  name_long: "Karura",
  homePage: "https://karura.network/",
  blockExplorerTX: "https://karura.subscan.io/extrinsic/[[txHash]]",
  blockExplorerAddr: "https://karura.subscan.io/account/[[address]]",
  isTestNetwork: false,
  currencyName: "KAR",
  icon: require("../icons/karura.svg"),
  decimals: 12,
  prefix: 8,
  node: "wss://karura.polkawallet.io",
  gradient: "linear-gradient(330.21deg, #E40C5B -26.31%, #FF4C3B 88.17%)",
  coingeckoID: "karura",
  genesisHash:
    "0xbaf5aabe40646d11f0ee8abbdc64f4a4b7674925cba08e4a05ff9ebed6e2126b",
  activityHandler: wrapActivityHandler(subscanActivity),
};

const karura = new SubstrateNetwork(karuraOptions);

karura.assets = assets;

export default karura;
