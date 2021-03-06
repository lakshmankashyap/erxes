import gql from 'graphql-tag';
import { Alert, withProps } from 'modules/common/utils';
import { generatePaginationParams } from 'modules/common/utils/router';
import * as React from 'react';
import { compose, graphql } from 'react-apollo';
import { NotificationList } from '../components';
import { mutations, queries } from '../graphql';
import {
  MarkAsReadMutationResponse,
  NotificationsCountQueryResponse,
  NotificationsQueryResponse
} from '../types';

type Props = {
  queryParams: any;
};

type FinalProps = {
  notificationsQuery: NotificationsQueryResponse;
  notificationCountQuery: NotificationsCountQueryResponse;
} & Props &
  MarkAsReadMutationResponse;

class NotificationListContainer extends React.Component<FinalProps> {
  render() {
    const {
      notificationsQuery,
      notificationCountQuery,
      notificationsMarkAsReadMutation
    } = this.props;

    const markAsRead = (notificationIds?: string[]) => {
      notificationsMarkAsReadMutation({
        variables: { _ids: notificationIds }
      })
        .then(() => {
          notificationsQuery.refetch();
          Alert.success('Notification have been seen');
        })
        .catch(error => {
          Alert.error(error.message);
        });
    };

    const updatedProps = {
      ...this.props,

      markAsRead,
      notifications: notificationsQuery.notifications || [],
      count: notificationCountQuery.notificationCounts || 0
    };

    return <NotificationList {...updatedProps} />;
  }
}

export default withProps<Props>(
  compose(
    graphql<
      Props,
      NotificationsQueryResponse,
      { requireRead: boolean; page?: number; perPage?: number; title?: string }
    >(gql(queries.notifications), {
      name: 'notificationsQuery',
      options: ({ queryParams }) => ({
        variables: {
          ...generatePaginationParams(queryParams),
          requireRead: false,
          title: queryParams.title
        }
      })
    }),
    graphql<Props, NotificationsCountQueryResponse>(
      gql(queries.notificationCounts),
      {
        name: 'notificationCountQuery',
        options: () => ({
          variables: {
            requireRead: false
          }
        })
      }
    ),
    graphql<Props, MarkAsReadMutationResponse, { _ids?: string[] }>(
      gql(mutations.markAsRead),
      {
        name: 'notificationsMarkAsReadMutation',
        options: {
          refetchQueries: () => ['notificationCounts']
        }
      }
    )
  )(NotificationListContainer)
);
