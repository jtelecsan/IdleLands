import { Inject } from 'typescript-ioc';
import { compact } from 'lodash';

import { RNGService } from '../rng-service';
import { EventMessageParser } from '../event-message-parser';
import { Player, Item } from '../../../../shared/models/entity';
import { AssetManager } from '../asset-manager';
import { Stat, GenerateableItemSlot, IAdventureLog, AdventureLogEventType } from '../../../../shared/interfaces';
import { PlayerManager } from '../player-manager';
import { EventManager } from '@angular/platform-browser';
import { SubscriptionManager, Channel } from '../subscription-manager';

export enum EventType {
  Battle = 'battle',
  BlessGold = 'blessGold',
  BlessGoldParty = 'blessGoldParty',
  BlessItem = 'blessItem',
  BlessXP = 'blessXp',
  BlessXPParty = 'blessXpParty',
  Enchant = 'enchant',
  FindItem = 'findItem',
  Switcheroo = 'flipStat',
  ForsakeGold = 'forsakeGold',
  ForsakeItem = 'forsakeItem',
  ForsakeXP = 'forsakeXp',
  LevelDown = 'levelDown',
  Merchant = 'merchant',
  Party = 'party',
  Providence = 'providence',
  Tinker = 'tinker'
}

export abstract class Event {
  public static readonly WEIGHT: number = 0;

  @Inject protected rng: RNGService;
  @Inject protected assetManager: AssetManager;
  @Inject protected messageParser: EventMessageParser;
  @Inject protected playerManager: PlayerManager;
  @Inject protected eventManager: EventManager;
  @Inject protected subscriptionManager: SubscriptionManager;

  protected statTiers = {
    t1: [Stat.AGI, Stat.DEX],
    t2: [Stat.STR, Stat.INT, Stat.CON],
    t3: [Stat.LUK]
  };

  protected _parseText(message: string, player: Player, extra: any): string {
    return this.messageParser.stringFormat(message, player, extra);
  }

  protected eventText(eventType: string, player: Player, extra: any): string {
    return this._parseText(this.rng.chance.pickone(this.assetManager.allStringAssets[eventType]), player, extra);
  }

  protected pickStat(): Stat {
    return this.rng.chance.pickone([Stat.AGI, Stat.CON, Stat.DEX, Stat.INT, Stat.STR, Stat.LUK]);
  }

  protected pickTinkerStat(): Stat {
    return this.rng.chance.pickone([Stat.XP, Stat.HP, Stat.GOLD]);
  }

  protected validItems(player: Player): Item[] {
    return compact(GenerateableItemSlot.map(slot => player.$inventory.itemInEquipmentSlot(slot)));
  }

  protected pickValidItem(player: Player): Item {
    return this.rng.chance.pickone(this.validItems(player));
  }

  protected pickValidEnchantItem(player: Player): Item {
    return this.rng.chance.pickone(this.validItems(player).filter(i => i.isCurrentlyEnchantable(player)));
  }

  protected pickValidBlessItem(player: Player): Item {
    return this.rng.chance.pickone(this.validItems(player).filter(i => i.isUnderBoostablePercent(player)));
  }

  protected emitMessage(players: Player[], message: string, type: AdventureLogEventType, link?: string) {
    const playerNames = players.map(x => x.name);
    const messageData: IAdventureLog = {
      when: Date.now(),
      type,
      message,
      link
    };

    this.subscriptionManager.emitToChannel(Channel.EventMessage, { playerNames, data: messageData });
  }

  public abstract operateOn(player: Player);
}
