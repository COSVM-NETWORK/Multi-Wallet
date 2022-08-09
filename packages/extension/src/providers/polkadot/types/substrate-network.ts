import { BaseNetwork, BaseNetworkOptions } from "@/types/base-network";
import SubstrateAPI from "@/providers/polkadot/libs/api";
import { AssetsType } from "@/types/provider";
import { BaseToken } from "@/types/base-token";
import { ProviderName } from "@/types/provider";
import { NetworkNames, SignerType } from "@enkryptcom/types";
import { polkadotEncodeAddress } from "@enkryptcom/utils";
import createIcon from "../libs/blockies";
import MarketData from "@/libs/market-data";
import { fromBase } from "@/libs/utils/units";
import BigNumber from "bignumber.js";
import {
  formatFiatValue,
  formatFloatingPointValue,
} from "@/libs/utils/number-formatter";
import Sparkline from "@/libs/sparkline";
import { SubstrateNativeToken } from "./substrate-native-token";
import { Activity } from "@/types/activity";
import { getApi, addNewApi } from "../libs/api-promises";

export interface SubstrateNetworkOptions {
  name: NetworkNames;
  name_long: string;
  homePage: string;
  blockExplorerTX: string;
  blockExplorerAddr: string;
  isTestNetwork: boolean;
  currencyName: string;
  icon: string;
  decimals: number;
  prefix: number;
  gradient: string;
  node: string;
  coingeckoID?: string;
  genesisHash: string;
  activityHandler: (
    network: BaseNetwork,
    address: string
  ) => Promise<Activity[]>;
}

export class SubstrateNetwork extends BaseNetwork {
  public prefix: number;
  public assets: BaseToken[] = [];
  public genesisHash: string;

  private activityHandler: (
    network: BaseNetwork,
    address: string
  ) => Promise<Activity[]>;
  constructor(options: SubstrateNetworkOptions) {
    const api = async () => {
      if (getApi(options.node)) return getApi(options.node);
      const api = new SubstrateAPI(options.node, {
        decimals: options.decimals,
        name: options.name,
      });
      await api.init();
      addNewApi(options.node, api);
      return api;
    };

    const baseOptions: BaseNetworkOptions = {
      basePath: "//",
      identicon: createIcon,
      signer: [SignerType.sr25519, SignerType.ed25519],
      displayAddress: (address: string) =>
        polkadotEncodeAddress(address, options.prefix),
      provider: ProviderName.polkadot,
      api,
      ...options,
    };
    super(baseOptions);
    this.prefix = options.prefix;
    this.genesisHash = options.genesisHash;

    this.activityHandler = options.activityHandler;
  }

  public getAllTokens(): Promise<BaseToken[]> {
    return Promise.resolve(this.assets);
  }

  public async getAllTokenInfo(address: string): Promise<AssetsType[]> {
    const supported = this.assets;

    if (supported.length === 0) {
      const nativeToken = new SubstrateNativeToken({
        name: this.name_long,
        symbol: this.name,
        coingeckoID: this.coingeckoID,
        decimals: this.decimals,
        icon: this.icon,
      });

      supported.push(nativeToken);
    }

    const api = await this.api();

    const balancePromises = supported.map((token) =>
      token.getLatestUserBalance((api as SubstrateAPI).api, address)
    );
    const marketData = new MarketData();
    const market = await marketData.getMarketData(
      supported.map(({ coingeckoID }) => coingeckoID ?? "")
    );

    const balances = (await Promise.all(
      balancePromises
    )) as unknown as number[];

    const tokens: AssetsType[] = supported.map((st, idx) => {
      const userBalance = fromBase(balances[idx].toString(), st.decimals);
      const usdBalance = new BigNumber(userBalance).times(
        market[idx]?.current_price || 0
      );
      return {
        balance: balances[idx].toString(),
        balancef: formatFloatingPointValue(userBalance).value,
        balanceUSD: usdBalance.toNumber(),
        balanceUSDf: formatFiatValue(usdBalance.toString()).value,
        decimals: st.decimals,
        icon: st.icon,
        name: st.name,
        symbol: st.symbol,
        priceChangePercentage:
          market[idx]?.price_change_percentage_7d_in_currency || 0,
        sparkline: market[idx]
          ? new Sparkline(market[idx]?.sparkline_in_7d.price, 25).dataUri
          : "",
        value: market[idx]?.current_price.toString() || "0",
        valuef: formatFloatingPointValue(
          market[idx]?.current_price.toString() || "0"
        ).value,
        baseToken: st,
      };
    });
    const nonNativNonZeroList = tokens.filter(
      (asset, idx) => idx !== 0 && asset.balance !== "0"
    );
    nonNativNonZeroList.sort((a, b) => {
      if (a.balanceUSD < b.balanceUSD) return 1;
      else if (a.balanceUSD > b.balanceUSD) return -1;
      else return 0;
    });
    nonNativNonZeroList.unshift(tokens[0]);
    return nonNativNonZeroList;
  }
  public getAllActivity(address: string): Promise<Activity[]> {
    return this.activityHandler(this, address);
  }
}
