App = {
  web3Provider: null,
  contracts: {},
  account: '0x0',

  init: function() {
    return App.initWeb3();
  },

  initWeb3: function() {
    if (typeof web3 !== 'undefined') {
      App.web3Provider = web3.currentProvider;
      console.warn("Meata");
    }else{
      App.web3Provider = new Web3.providers.HttpProvider('https://localhost:8545');
    }
    web3 = new Web3(App.web3Provider);

    return App.initContract();
  },

  initContract: function() {

    $.getJSON("Election.json",function(election){

      App.contracts.Election = TruffleContract(election);
      App.contracts.Election.setProvider(App.web3Provider);

      App.listenForEvents();

      return App.reander();
    })

  },

  reander: function(){

    var electionInstance;
    var $loader = $("#loader");
    var $content = $("#content");

    $loader.show();
    $content.hide();

    //获得账号信息
    web3.eth.getCoinbase(function(err,account){
      if(err === null){
        App.account = account;
        $("#accountAddress").html("Your current account number is: " + account);
      }
    });

    //加载数据
    App.contracts.Election.deployed().then(function(instance){
      electionInstance = instance;
      return electionInstance.candidateCount();
    }).then(function(candidatesCount){
      var $candidatesResults = $("#candidatesResults");
      $candidatesResults.empty();

      var $cadidatesSelect = $("#cadidatesSelect");
      $cadidatesSelect.empty();

      for (var i=1;i<=candidatesCount;i++){
        electionInstance.candidates(i).then(function(candidate){
          var id = candidate[0];
          var name = candidate[1];
          var voteCount = candidate[2];

          var candidateTemplate = "<tr><th>"+id+"</th><td>"+name+"</td><td>"+voteCount+"</td></tr>";
          $candidatesResults.append(candidateTemplate);

          //投票
          var cadidateOption = "<option value='"+id+"'>"+name+"</option>";
          $cadidatesSelect.append(cadidateOption);

        });
      }

      return electionInstance.voters(App.account);

    }).then(function(hasVoted){

      if(hasVoted){
        $('form').hide();
      }
      $loader.hide();
      $content.show();

    }).catch(function(err){
      console.warn(err);
    });

  },

  //投票
  castVote: function(){

    var $loader = $("#loader");
    var $content = $("#content");

    var candidateId = $('#cadidatesSelect').val();

    App.contracts.Election.deployed().then(function(instance){
      return instance.vote(candidateId,{from: App.account});
    }).then(function(result){
      $content.hide();
      $loader.show();
    }).catch(function(err){
      console.warn(err);
    });

  },

  //监听事件
  listenForEvents: function(){
    App.contracts.Election.deployed().then(function(instance){
      instance.votedEvent({},{
       formBlock:0,
       toBlock: 'latest'
      }).watch(function(error,event){
        console.log("event triggered",event);
        App.reander();
      });
    })
  }

};

$(function() {
  $(window).load(function() {
    App.init();
  });
});