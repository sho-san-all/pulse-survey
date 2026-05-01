import { WebClient } from '@slack/web-api'

export const slack = new WebClient(process.env.SLACK_BOT_TOKEN)

// サーベイメッセージをDMで送信
export async function sendSurveyDM(slackUserId: string) {
  // DMチャンネルを開く
  const dm = await slack.conversations.open({ users: slackUserId })
  const channelId = (dm.channel as any).id

  await slack.chat.postMessage({
    channel: channelId,
    text: 'こんにちは！今週のチェックインです 👋',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'こんにちは！今週のチェックインです 👋\n1〜5でタップしてください（1=低い、5=高い）',
        },
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: '*① こころの調子*' },
      },
      {
        type: 'actions',
        block_id: 'mind_score',
        elements: [1, 2, 3, 4, 5].map((n) => ({
          type: 'button',
          text: {
            type: 'plain_text',
            text: ['😫', '😟', '😐', '🙂', '😄'][n - 1] + ` ${n}`,
          },
          value: String(n),
          action_id: `mind_${n}`,
        })),
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: '*② からだの調子*' },
      },
      {
        type: 'actions',
        block_id: 'body_score',
        elements: [1, 2, 3, 4, 5].map((n) => ({
          type: 'button',
          text: {
            type: 'plain_text',
            text: ['😔', '😓', '😐', '💪', '🏃'][n - 1] + ` ${n}`,
          },
          value: String(n),
          action_id: `body_${n}`,
        })),
      },
      {
        type: 'input',
        block_id: 'free_text',
        optional: true,
        label: { type: 'plain_text', text: '③ 一言あれば（任意）' },
        element: {
          type: 'plain_text_input',
          action_id: 'free_text_input',
          placeholder: {
            type: 'plain_text',
            text: '気になることや、伝えたいことがあれば...',
          },
          multiline: true,
        },
      },
      {
        type: 'actions',
        block_id: 'submit',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: '送信する' },
            style: 'primary',
            action_id: 'submit_survey',
            value: 'submit',
          },
        ],
      },
    ],
  })
}