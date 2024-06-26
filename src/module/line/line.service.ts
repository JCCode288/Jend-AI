import { Injectable, Logger } from '@nestjs/common';
import { LineWebhookService } from './line-webhook/line-webhook.service';
import { LineWebhookDto } from './line-webhook/webhook-dto/webhook.dto';
import { IMetaContact } from './line-webhook/webhook-dto/send-message.dto';
import { ChainService } from '../openai/chains/chain.service';

@Injectable()
export class LineService {
  private readonly logger = new Logger();

  constructor(
    private readonly lineWebhookService: LineWebhookService,
    private readonly gptChain: ChainService,
  ) {}

  async handleMessage(body: LineWebhookDto, signature: string) {
    try {
      const topEvent = body.events[0];
      const message = topEvent?.message;
      const info: IMetaContact = {
        replyToken: topEvent?.replyToken,
        userId: topEvent.source.userId,
      };

      if (!signature || typeof signature !== 'string') {
        return { message: 'OK' };
      }

      // const bodyString: string = JSON.stringify(body);

      // const isValid = await this.lineWebhookService.verifyMessage(
      //   bodyString,
      //   signature,
      // );

      // if (!isValid || (!message && topEvent.type !== 'message')) {
      //   return { event: 'OK' };
      // }

      this.logger.log(message, LineService.name + ' Webhook Post');

      const aiMessage = await this.prompt(message.text, info.userId);

      const send_message = await this.lineWebhookService.sendMessage({
        info,
        message: aiMessage,
      });

      this.logger.log(aiMessage, LineService.name + ' Webhook Post');

      return { response: 'OK', send_message };
    } catch (err) {
      throw err;
    }
  }

  private async prompt(
    message: string,
    sessionId: string = new Date().toUTCString(),
  ) {
    try {
      const response = await this.gptChain.promptAnswer(message, sessionId);

      return response;
    } catch (err) {
      this.logger.log(err, LineWebhookService.name + ' handleMessage');
      throw err;
    }
  }
}
