import client from 'apolloClient';
import gql from 'graphql-tag';
import { Bulk } from 'modules/common/components';
import { __, Alert, withProps } from 'modules/common/utils';
import { generatePaginationParams } from 'modules/common/utils/router';
import { handleXlsUpload } from 'modules/customers/utils';
import * as React from 'react';
import { compose, graphql } from 'react-apollo';
import { withRouter } from 'react-router';
import { IRouterProps } from '../../common/types';
import { DefaultColumnsConfigQueryResponse } from '../../settings/properties/types';
import { CompaniesList } from '../components';
import { mutations, queries } from '../graphql';
import {
  ListConfigQueryResponse,
  ListQueryVariables,
  MainQueryResponse,
  MergeMutationResponse,
  MergeMutationVariables,
  RemoveMutationResponse,
  RemoveMutationVariables
} from '../types';

type Props = {
  queryParams?: any;
};

type FinalProps = {
  companiesMainQuery: MainQueryResponse;
  companiesListConfigQuery: DefaultColumnsConfigQueryResponse;
} & Props &
  IRouterProps &
  RemoveMutationResponse &
  MergeMutationResponse;

type State = {
  loading: boolean;
};

class CompanyListContainer extends React.Component<FinalProps, State> {
  constructor(props) {
    super(props);

    this.state = {
      loading: false
    };
  }

  render() {
    const {
      companiesMainQuery,
      companiesListConfigQuery,
      companiesRemove,
      companiesMerge,
      history
    } = this.props;
    let columnsConfig =
      companiesListConfigQuery.fieldsDefaultColumnsConfig || [];

    // load config from local storage
    const localConfig = localStorage.getItem('erxes_company_columns_config');

    if (localConfig) {
      columnsConfig = JSON.parse(localConfig);
    }

    const removeCompanies = ({ companyIds }, emptyBulk) => {
      companiesRemove({
        variables: { companyIds }
      })
        .then(() => {
          emptyBulk();
          Alert.success('You successfully deleted a company');
        })
        .catch(e => {
          Alert.error(e.message);
        });
    };

    const mergeCompanies = ({ ids, data, callback }) => {
      companiesMerge({
        variables: {
          companyIds: ids,
          companyFields: data
        }
      })
        .then(response => {
          Alert.success('You successfully merged companies');
          callback();
          history.push(
            `/companies/details/${response.data.companiesMerge._id}`
          );
        })
        .catch(e => {
          Alert.error(e.message);
        });
    };

    const searchValue = this.props.queryParams.searchValue || '';
    const { list = [], totalCount = 0 } =
      companiesMainQuery.companiesMain || {};

    const exportCompanies = bulk => {
      const { queryParams } = this.props;

      // queryParams page parameter needs convert to int.
      if (queryParams.page) {
        queryParams.page = parseInt(queryParams.page, 10);
      }

      if (bulk.length > 0) {
        queryParams.ids = bulk.map(customer => customer._id);
      }

      this.setState({ loading: true });

      client
        .query({
          query: gql(queries.companiesExport),
          variables: { ...queryParams }
        })
        .then(({ data }: any) => {
          this.setState({ loading: false });
          window.open(data.companiesExport, '_blank');
        })
        .catch(error => {
          this.setState({ loading: false });
          Alert.error(error.message);
        });
    };

    const uploadXls = e => {
      handleXlsUpload({
        e,
        type: 'company',
        afterUploadCallback: response => {
          if (response.id) {
            history.push(`/settings/importHistory/${response.id}`);
          }
        }
      });
    };

    const updatedProps = {
      ...this.props,
      columnsConfig,
      totalCount,
      searchValue,
      companies: list,
      loading: companiesMainQuery.loading || this.state.loading,
      uploadXls,
      exportCompanies,
      removeCompanies,
      mergeCompanies
    };

    const companiesList = props => {
      return <CompaniesList {...updatedProps} {...props} />;
    };

    const refetch = () => {
      this.props.companiesMainQuery.refetch();
    };

    return <Bulk content={companiesList} refetch={refetch} />;
  }
}

const generateParams = ({ queryParams }) => ({
  variables: {
    ...generatePaginationParams(queryParams),
    segment: queryParams.segment,
    tag: queryParams.tag,
    brand: queryParams.brand,
    ids: queryParams.ids,
    searchValue: queryParams.searchValue,
    leadStatus: queryParams.leadStatus,
    lifecycleState: queryParams.lifecycleState,
    sortField: queryParams.sortField,
    sortDirection: queryParams.sortDirection
      ? parseInt(queryParams.sortDirection, 10)
      : undefined
  }
});

export default withProps<Props>(
  compose(
    graphql<{ queryParams: any }, MainQueryResponse, ListQueryVariables>(
      gql(queries.companiesMain),
      {
        name: 'companiesMainQuery',
        options: generateParams
      }
    ),
    graphql<{}, ListConfigQueryResponse, {}>(gql(queries.companiesListConfig), {
      name: 'companiesListConfigQuery'
    }),
    // mutations
    graphql<{}, RemoveMutationResponse, RemoveMutationVariables>(
      gql(mutations.companiesRemove),
      {
        name: 'companiesRemove'
      }
    ),
    graphql<{}, MergeMutationResponse, MergeMutationVariables>(
      gql(mutations.companiesMerge),
      {
        name: 'companiesMerge',
        options: {
          refetchQueries: ['companiesMain', 'companyCounts']
        }
      }
    )
  )(withRouter<IRouterProps>(CompanyListContainer))
);
